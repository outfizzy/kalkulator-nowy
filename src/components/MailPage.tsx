import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Mock Email Data
const MOCK_INBOX = [
    { id: 1, from: 'klient@example.com', subject: 'Pytanie o ofertę ODH-2024/05/23', date: '2024-05-23 10:30', read: false },
    { id: 2, from: 'biuro@architekci.pl', subject: 'Współpraca przy projekcie', date: '2024-05-22 14:15', read: true },
    { id: 3, from: 'jan.kowalski@gmail.com', subject: 'Re: Termin montażu', date: '2024-05-21 09:00', read: true },
];

const MOCK_SENT = [
    { id: 4, to: 'klient@example.com', subject: 'Oferta ODH-2024/05/23', date: '2024-05-23 10:00' },
    { id: 5, to: 'anna.nowak@firma.com', subject: 'Potwierdzenie spotkania', date: '2024-05-20 16:20' },
];

type MailTab = 'inbox' | 'sent' | 'compose';

export const MailPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<MailTab>('inbox');
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // to force refresh

    // Check if email is configured
    const isConfigured = !!currentUser?.emailConfig?.smtpHost;

    // Fetch Emails Effect
    React.useEffect(() => {
        const fetchEmails = async () => {
            if (!currentUser?.emailConfig?.imapHost || activeTab !== 'inbox') return;

            setLoading(true);
            try {
                const response = await fetch('/api/fetch-emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config: currentUser.emailConfig })
                });

                if (!response.ok) {
                    const errInfo = await response.json();
                    if (errInfo.details && errInfo.details.includes('authentication failed')) {
                        toast.error('Błąd logowania IMAP. Sprawdź hasło.');
                    }
                    throw new Error(errInfo.error || 'Fetch failed');
                }

                const data = await response.json();
                setEmails(data.messages || []);
            } catch (error) {
                console.error('Error fetching emails:', error);
                // Don't toast on every fetch error to avoid spam, unless it's critical
            } finally {
                setLoading(false);
            }
        };

        if (isConfigured) {
            fetchEmails();
        }
    }, [currentUser, activeTab, isConfigured, refreshTrigger]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!composeData.to || !composeData.subject || !composeData.body) {
            toast.error('Wypełnij wszystkie pola');
            return;
        }

        if (!isConfigured) {
            toast.error('Skonfiguruj ustawienia SMTP w profilu, aby wysyłać wiadomości.');
            return;
        }

        const toastId = toast.loading('Wysyłanie wiadomości...');

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: composeData.to,
                    subject: composeData.subject,
                    body: composeData.body,
                    config: currentUser?.emailConfig
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || 'Send failed');
            }

            toast.success(`Wysłano wiadomość do: ${composeData.to}`, { id: toastId });
            setComposeData({ to: '', subject: '', body: '' });
            setActiveTab('sent');
            // Optimistically add to sent list or re-fetch if we implemented Sent folder fetching
        } catch (error: any) {
            console.error('Send error:', error);
            toast.error(`Błąd wysyłania: ${error.message}`, { id: toastId });
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex flex-col gap-2">
                <button
                    onClick={() => setActiveTab('compose')}
                    className={`p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm ${activeTab === 'compose'
                        ? 'bg-accent text-white shadow-accent/30'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nowa Wiadomość
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-4 overflow-hidden">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`w-full p-4 flex items-center justify-between text-left transition-colors ${activeTab === 'inbox' ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <span>Odebrane</span>
                        </div>
                        {/* Optional: Add unread count if we fetch it */}
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`w-full p-4 flex items-center justify-between text-left transition-colors ${activeTab === 'sent' ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            <span>Wysłane</span>
                        </div>
                    </button>
                </div>

                {!isConfigured && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
                        <p className="font-bold mb-1">Konfiguracja Wymagana</p>
                        <p className="mb-2">Aby w pełni korzystać z poczty, skonfiguruj ustawienia SMTP/IMAP w swoim profilu.</p>
                        <Link to="/settings" className="text-orange-900 underline font-bold text-xs">
                            Przejdź do ustawień →
                        </Link>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Inbox View */}
                {activeTab === 'inbox' && (
                    <div className="flex-1 flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Skrzynka Odbiorcza</h2>
                            <button onClick={() => setRefreshTrigger(prev => prev + 1)} className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors" title="Odśwież">
                                <svg className={`w-5 h-5 ${loading ? 'animate-spin text-accent' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {emails.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {emails.map((mail, idx) => (
                                        <div key={mail.id || idx} className={`p-4 hover:bg-slate-50 cursor-pointer flex gap-4`}>
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold overflow-hidden">
                                                {mail.from ? (typeof mail.from === 'string' ? mail.from[0]?.toUpperCase() : '?') : '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`font-medium truncate text-slate-900`}>{typeof mail.from === 'string' ? mail.from.replace(/<.*>/, '') : 'Unknown'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                                        {new Date(mail.date).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className={`text-sm truncate text-slate-800 font-medium`}>{mail.subject}</p>
                                                {/* <p className="text-xs text-slate-400 truncate mt-1">...</p> */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-slate-400">
                                    {loading ? 'Ładowanie wiadomości...' : isConfigured ? 'Brak wiadomości' : 'Skonfiguruj IMAP aby pobrać pocztę'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Sent View */}
                {activeTab === 'sent' && (
                    <div className="flex-1 flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Wysłane</h2>
                        </div>
                        <div className="p-12 text-center text-slate-400">
                            Funkcja podglądu folderu "Wysłane" (Sent) dostępna wkrótce.
                        </div>
                        {/* 
                        <div className="flex-1 overflow-y-auto">
                            <div className="divide-y divide-slate-100">
                                {MOCK_SENT.map(mail => (
                                    // ... kept for later implementation
                                ))}
                            </div>
                        </div> 
                        */}
                    </div>
                )}

                {/* Compose View */}
                {activeTab === 'compose' && (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Nowa Wiadomość</h2>
                        </div>
                        <form onSubmit={handleSend} className="flex-1 flex flex-col p-6 gap-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Do:"
                                    className="w-full text-sm font-medium p-2 border-b border-slate-200 focus:border-accent outline-none transition-colors"
                                    value={composeData.to}
                                    onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Temat:"
                                    className="w-full text-lg font-bold p-2 border-b border-slate-200 focus:border-accent outline-none transition-colors"
                                    value={composeData.subject}
                                    onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                                />
                            </div>
                            <div className="flex-1">
                                <textarea
                                    className="w-full h-full p-4 resize-none outline-none text-slate-700"
                                    placeholder="Treść wiadomości..."
                                    value={composeData.body}
                                    onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                                />
                            </div>
                            {currentUser?.emailConfig?.signature && (
                                <div className="text-sm text-slate-500 border-t pt-4 mt-2 italic">
                                    <pre className="font-sans whitespace-pre-wrap">{currentUser.emailConfig.signature}</pre>
                                </div>
                            )}
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent-dark transition-colors shadow-lg shadow-accent/20 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Wyślij Wiadomość
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
