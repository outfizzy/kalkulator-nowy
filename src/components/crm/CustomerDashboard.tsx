import React, { useState } from 'react';
import type { Customer, Installation, Communication, Lead, Offer, Contract } from '../../types';
import { VoiceConfirmationButton } from '../voice/VoiceConfirmationButton';
import { CustomerNotesWidget } from './widgets/CustomerNotesWidget';
import { LocationPreviewWidget } from './widgets/LocationPreviewWidget';
import { AICallWidget } from './widgets/AICallWidget';
// import { DatabaseService } from '../../services/database';

interface CustomerDashboardProps {
    customer: Customer;
    installations: Installation[];
    communications: Communication[];
    leads: Lead[];
    offers: Offer[];
    contracts: Contract[];
    onRefresh: () => void;
}

interface CalendarEvent {
    type: 'installation' | 'lead';
    color: string;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
    customer,
    installations,
    communications,
    leads,
    offers,
    contracts,
    onRefresh
}) => {
    const nextInstallation = installations
        .filter(i => i.status === 'scheduled' || i.status === 'pending')
        .sort((a, b) => new Date(a.scheduledDate || 0).getTime() - new Date(b.scheduledDate || 0).getTime())[0];

    // Calendar Logic
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay: firstDay === 0 ? 6 : firstDay - 1 }; // Adjust for Monday start
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const calendarDays = Array.from({ length: 42 }, (_, i) => {
        const day = i - firstDay + 1;
        if (day <= 0 || day > days) return null;
        return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    });

    const getEventsForDate = (date: Date | null): CalendarEvent[] => {
        if (!date) return [];
        const dateStr = date.toDateString();
        const events: CalendarEvent[] = [];

        // Installation events
        installations.forEach(i => {
            if (i.scheduledDate && new Date(i.scheduledDate).toDateString() === dateStr) {
                events.push({ type: 'installation', color: 'bg-accent' });
            }
        });

        // Lead events (creation)
        leads.forEach(l => {
            if (new Date(l.createdAt).toDateString() === dateStr) {
                events.push({ type: 'lead', color: 'bg-blue-400' });
            }
        });

        return events;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN (2/3) */}
            <div className="lg:col-span-2 space-y-6">

                {/* 1. NEXT ACTION / STATUS CARD */}
                {nextInstallation ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Nadchodzący Montaż</h3>
                                    <p className="text-slate-500 text-sm">Masz zaplanowany montaż dla tego klienta.</p>
                                </div>
                                <span className="bg-accent/10 text-accent-dark px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                    {nextInstallation.status === 'scheduled' ? 'Za ' + Math.ceil((new Date(nextInstallation.scheduledDate || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + ' dni' : 'Oczekujący'}
                                </span>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center min-w-[60px]">
                                        <div className="text-xs text-slate-500 uppercase font-bold">{new Date(nextInstallation.scheduledDate || '').toLocaleString('pl-PL', { month: 'short' })}</div>
                                        <div className="text-xl font-bold text-slate-900">{new Date(nextInstallation.scheduledDate || '').getDate()}</div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{nextInstallation.productSummary}</h4>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {new Date(nextInstallation.scheduledDate || '').toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} • {nextInstallation.team?.name || 'Nie przypisano ekipy'}
                                        </p>
                                    </div>
                                </div>
                                {nextInstallation.status === 'scheduled' && (
                                    <VoiceConfirmationButton
                                        leadId={leads[0]?.id}
                                        customerName={`${customer.firstName} ${customer.lastName}`}
                                        phoneNumber={customer.phone}
                                        installationDate={nextInstallation.scheduledDate!}
                                        installationId={nextInstallation.id}
                                        customerId={customer.id!}
                                        onSuccess={onRefresh}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">Brak aktywnych montaży</h3>
                            <p className="text-blue-100 mb-6 max-w-md">Ten klient nie ma obecnie zaplanowanych żadnych prac. Możesz utworzyć nową ofertę lub sprawdzić status leadów.</p>
                            <div className="flex gap-3">
                                <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-sm">
                                    + Nowa Oferta
                                </button>
                                <button className="bg-blue-700/50 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                    Zobacz Leady
                                </button>
                            </div>
                        </div>
                        {/* Decor */}
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                            <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                    </div>
                )}

                {/* 2. ACTIVITY TIMELINE (Simplified) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Ostatnia Aktywność
                    </h3>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">

                        {communications.length === 0 && <div className="text-slate-400 text-sm pl-10">Brak historii komunikacji.</div>}

                        {communications.slice(0, 5).map((comm) => (
                            <div key={comm.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                {/* Icon */}
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-white text-slate-500 group-[.is-active]:text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                    {comm.type === 'call' ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    )}
                                </div>
                                {/* Card */}
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                        <div className="font-bold text-slate-900 text-sm">
                                            {comm.subject || (comm.type === 'call' ? 'Rozmowa telefoniczna' : 'Wiadomość')}
                                        </div>
                                        <time className="font-mono text-xs text-slate-500">{new Date(comm.createdAt).toLocaleString()}</time>
                                    </div>
                                    <div className="text-slate-500 text-sm">
                                        {comm.content}
                                    </div>
                                    {/* Audio Player if URL exists */}
                                    {comm.metadata?.recordingUrl && (
                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                            <audio controls className="w-full h-8" src={comm.metadata.recordingUrl} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN (1/3) */}
            <div className="space-y-6">

                {/* 0. AI CALL AGENT - NEW */}
                <AICallWidget
                    phoneNumber={customer.phone}
                    customerName={`${customer.firstName} ${customer.lastName}`}
                    installationId={nextInstallation?.id}
                    customerId={customer.id!}
                    leadId={leads[0]?.id}
                />

                {/* 1. CUSTOMER NOTES (Pinned) - NEW */}
                <CustomerNotesWidget customerId={customer.id!} />

                {/* 2. MINI CALENDAR */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Kalendarz</h3>
                        <div className="flex gap-1">
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="text-sm font-medium text-slate-700 min-w-[80px] text-center">
                                {currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(day => (
                            <div key={day} className="text-slate-400 font-medium py-1">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-sm">
                        {calendarDays.map((date, i) => {
                            if (!date) return <div key={i}></div>;

                            const events = getEventsForDate(date);
                            const isToday = date.toDateString() === new Date().toDateString();

                            return (
                                <div key={i} className={`
                                     aspect-square flex flex-col items-center justify-center rounded-lg relative cursor-default
                                     ${isToday ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'}
                                 `}>
                                    {date.getDate()}
                                    {events.length > 0 && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {events.map((ev, idx) => (
                                                <div key={idx} className={`w-1 h-1 rounded-full ${ev.color}`}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex gap-4 text-xs text-slate-500 justify-center">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-accent"></div> Montaż
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div> Lead
                        </div>
                    </div>
                </div>

                {/* 3. LOCATION PREVIEW - NEW */}
                <LocationPreviewWidget
                    address={`${customer.street} ${customer.houseNumber}`}
                    city={customer.city}
                    postalCode={customer.postalCode}
                    // Try to find coords from installation client data if available
                    coordinates={installations[0]?.client?.coordinates}
                />

                {/* 4. KEY METRICS SMALL */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Podsumowanie</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-500">Wartość Ofert</span>
                            <span className="font-bold text-slate-900">
                                {offers.reduce((acc, o) => acc + (o.pricing?.sellingPriceNet || 0), 0)
                                    .toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-500">Ilość Umów</span>
                            <span className="font-bold text-slate-900">{contracts.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-500">Otwarte Leady</span>
                            <span className="font-bold text-amber-600">{leads.filter(l => l.status !== 'won' && l.status !== 'lost').length}</span>
                        </div>
                    </div>
                </div>

                {/* 5. QUICK ACTIONS */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-sm p-6 text-white">
                    <h3 className="font-bold mb-2">Szybki Kontakt</h3>
                    <p className="text-slate-300 text-sm mb-4">Skontaktuj się z klientem jednym kliknięciem.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => window.location.href = `tel:${customer.phone}`}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 p-3 rounded-lg flex flex-col items-center justify-center transition-colors"
                        >
                            <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span className="text-xs font-medium">Zadzwoń</span>
                        </button>
                        <button
                            onClick={() => window.location.href = `mailto:${customer.email}`}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 p-3 rounded-lg flex flex-col items-center justify-center transition-colors"
                        >
                            <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="text-xs font-medium">Email</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
