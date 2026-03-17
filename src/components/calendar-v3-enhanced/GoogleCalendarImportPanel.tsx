import React, { useState, useEffect } from 'react';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { GoogleEventImportModal } from './GoogleEventImportModal';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import toast from 'react-hot-toast';

export interface GoogleCalendarEvent {
    googleEvent: {
        id: string;
        summary: string;
        description?: string;
        location?: string;
        start: { date?: string; dateTime?: string };
        end: { date?: string; dateTime?: string };
        htmlLink?: string;
    };
    parsedData: {
        firstName: string | null;
        lastName: string | null;
        city: string | null;
        address: string | null;
        postalCode: string | null;
        phone: string | null;
        email: string | null;
        contractNumber: string | null;
        productSummary: string | null;
        eventType: 'montaz' | 'serwis' | 'dokończenie' | 'unknown';
        notes: string | null;
        durationDays: number;
    };
    match: {
        type: string;
        customerId?: string;
        contractId?: string;
        contractNumber?: string;
        customerName?: string;
    } | null;
}

interface GoogleCalendarImportPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    montaz: { label: 'Montaż', emoji: '🏗️', color: 'bg-blue-100 text-blue-700' },
    serwis: { label: 'Serwis', emoji: '🔧', color: 'bg-orange-100 text-orange-700' },
    'dokończenie': { label: 'Dokończenie', emoji: '🔄', color: 'bg-green-100 text-green-700' },
    unknown: { label: 'Nieznany', emoji: '❓', color: 'bg-slate-100 text-slate-600' },
};

export const GoogleCalendarImportPanel: React.FC<GoogleCalendarImportPanelProps> = ({
    isOpen,
    onClose,
    onImported,
}) => {
    const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [importModalEvent, setImportModalEvent] = useState<GoogleCalendarEvent | null>(null);

    useEffect(() => {
        if (isOpen) {
            void loadEvents();
        }
    }, [isOpen]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const data = await GoogleCalendarService.importEvents();
            setEvents(data);
            if (data.length === 0) {
                toast.success('Wszystkie eventy z Google Calendar są już zsynchronizowane!');
            }
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error('Błąd importu — sprawdź połączenie z Google Calendar');
        } finally {
            setLoading(false);
        }
    };

    const getEventDate = (e: GoogleCalendarEvent): string => {
        const d = e.googleEvent.start?.date || e.googleEvent.start?.dateTime;
        if (!d) return '—';
        try {
            return format(new Date(d), 'dd MMM yyyy', { locale: pl });
        } catch {
            return d;
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="text-lg">📅</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Google Calendar Import</h2>
                            <p className="text-green-100 text-xs">
                                {loading ? 'Ładowanie i parsowanie AI...' : `${events.length} eventów do importu`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-700">Analizowanie eventów...</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    AI parsuje dane z Google Calendar i szuka dopasowań w bazie
                                </p>
                            </div>
                        </div>
                    )}

                    {!loading && events.length === 0 && (
                        <div className="text-center py-16">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="font-bold text-slate-700">Wszystko zsynchronizowane!</p>
                            <p className="text-sm text-slate-400 mt-1">
                                Brak eventów Google Calendar do importu
                            </p>
                        </div>
                    )}

                    {!loading && events.map((event, idx) => {
                        const typeConfig = EVENT_TYPE_CONFIG[event.parsedData.eventType] || EVENT_TYPE_CONFIG.unknown;
                        const hasMatch = !!event.match;
                        const parsedName = [event.parsedData.firstName, event.parsedData.lastName].filter(Boolean).join(' ');

                        return (
                            <div
                                key={event.googleEvent.id || idx}
                                className={`rounded-xl border-2 p-4 transition-all hover:shadow-md cursor-pointer ${
                                    hasMatch
                                        ? 'border-green-200 bg-green-50/50 hover:border-green-400'
                                        : 'border-amber-200 bg-amber-50/50 hover:border-amber-400'
                                }`}
                                onClick={() => setImportModalEvent(event)}
                            >
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeConfig.color}`}>
                                            {typeConfig.emoji} {typeConfig.label}
                                        </span>
                                        <span className="text-xs text-slate-400">{getEventDate(event)}</span>
                                    </div>
                                    {hasMatch ? (
                                        <span className="text-[10px] font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                                            ✅ Dopasowany
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                                            🆕 Nowy
                                        </span>
                                    )}
                                </div>

                                {/* Google Calendar title */}
                                <p className="font-bold text-slate-800 text-sm truncate">
                                    {event.googleEvent.summary || '(bez tytułu)'}
                                </p>

                                {/* AI-parsed data */}
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                    {parsedName && (
                                        <span>👤 {parsedName}</span>
                                    )}
                                    {event.parsedData.city && (
                                        <span>📍 {event.parsedData.city}</span>
                                    )}
                                    {event.parsedData.contractNumber && (
                                        <span>📄 {event.parsedData.contractNumber}</span>
                                    )}
                                    {event.parsedData.productSummary && (
                                        <span>📦 {event.parsedData.productSummary}</span>
                                    )}
                                </div>

                                {/* Match info */}
                                {hasMatch && (
                                    <div className="mt-2 bg-green-100 rounded-lg px-3 py-1.5 text-xs text-green-800">
                                        <strong>Znaleziono:</strong> {event.match!.customerName}
                                        {event.match!.contractNumber && ` (${event.match!.contractNumber})`}
                                    </div>
                                )}

                                {/* Action hint */}
                                <div className="mt-3 flex items-center justify-between">
                                    {hasMatch ? (
                                        <span className="text-[10px] text-green-600 font-medium">
                                            Kliknij aby połączyć z istniejącym klientem →
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-amber-600 font-medium">
                                            Kliknij aby dodać do systemu →
                                        </span>
                                    )}
                                    {event.googleEvent.htmlLink && (
                                        <a
                                            href={event.googleEvent.htmlLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-slate-400 hover:text-blue-500 underline"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            Otwórz w Google
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                        onClick={loadEvents}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        🔄 Odśwież
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                    >
                        Zamknij
                    </button>
                </div>
            </div>

            {/* Import Modal */}
            {importModalEvent && (
                <GoogleEventImportModal
                    event={importModalEvent}
                    onClose={() => setImportModalEvent(null)}
                    onImported={() => {
                        setImportModalEvent(null);
                        // Remove from list
                        setEvents(prev => prev.filter(e => e.googleEvent.id !== importModalEvent.googleEvent.id));
                        onImported();
                    }}
                />
            )}
        </>
    );
};
