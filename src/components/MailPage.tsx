import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Mock Email Data
// Mock Email Data Removed for Production


type MailTab = 'inbox' | 'sent' | 'compose';

// Email Details Interface
interface EmailDetails {
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    text: string;
    html?: string;
}

export const MailPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<MailTab>('inbox');
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // to force refresh

    const [selectedEmail, setSelectedEmail] = useState<EmailDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

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

    const handleSelectEmail = async (uid: number) => {
        setLoadingDetails(true);
        setSelectedEmail(null); // Clear previous selection while loading
        try {
            const response = await fetch('/api/fetch-email-body', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: currentUser?.emailConfig,
                    uid: uid
                })
            });

            if (!response.ok) throw new Error('Failed to fetch email body');

            const data = await response.json();
            setSelectedEmail(data);
        } catch (error) {
            console.error('Error loading email details:', error);
            toast.error('Nie udało się pobrać treści wiadomości');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleBackToList = () => {
        setSelectedEmail(null);
    };

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
                    onClick={() => { setActiveTab('compose'); setSelectedEmail(null); }}
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
                        onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }}
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
                        onClick={() => { setActiveTab('sent'); setSelectedEmail(null); }}
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
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                {/* Inbox View */}
                {activeTab === 'inbox' && (
                    <div className="flex-1 flex flex-col h-full">
                        {selectedEmail || loadingDetails ? (
                            // Detail View
                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                                    <button
                                        onClick={handleBackToList}
                                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                                        title="Wróć do listy"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                    </button>
                                    <h2 className="text-lg font-bold text-slate-800 truncate flex-1">
                                        {loadingDetails ? 'Ładowanie...' : selectedEmail?.subject}
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-white">
                                    {loadingDetails ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                            <svg className="w-10 h-10 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <p>Pobieranie treści wiadomości...</p>
                                        </div>
                                    ) : selectedEmail && (
                                        <div className="max-w-4xl mx-auto">
                                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                                                <div>
                                                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{selectedEmail.subject}</h1>
                                                    <p className="text-slate-600"><strong>Od:</strong> {selectedEmail.from}</p>
                                                    <p className="text-slate-600"><strong>Do:</strong> {selectedEmail.to || 'Ja'}</p>
                                                </div>
                                                <div className="text-right text-sm text-slate-400">
                                                    {new Date(selectedEmail.date).toLocaleString('pl-PL')}
                                                </div>
                                            </div>

                                            <div className="email-content prose prose-slate max-w-none">
                                                {selectedEmail.html ? (
                                                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                                                ) : (
                                                    <pre className="whitespace-pre-wrap font-sans text-slate-700">{selectedEmail.text}</pre>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // List View
                            <>
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
                                                <div
                                                    key={mail.id || idx}
                                                    onClick={() => handleSelectEmail(mail.id)}
                                                    className="p-4 hover:bg-slate-50 cursor-pointer flex gap-4 transition-colors"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold overflow-hidden">
                                                        {mail.from ? (typeof mail.from === 'string' ? mail.from[0]?.toUpperCase() : '?') : '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-medium truncate text-slate-900">{typeof mail.from === 'string' ? mail.from.replace(/<.*>/, '') : 'Unknown'}</span>
                                                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                                                {new Date(mail.date).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm truncate text-slate-800 font-medium">{mail.subject}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Footer Info */}
                                            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                                                Pokazuję ostatnie 50 wiadomości.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-slate-400">
                                            {loading ? 'Ładowanie wiadomości...' : isConfigured ? 'Brak wiadomości' : 'Skonfiguruj IMAP aby pobrać pocztę'}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
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
