import React, { useEffect, useState } from 'react';
import { TelephonyService, type SMSLog } from '../../services/database/telephony.service';
import toast from 'react-hot-toast';

export const SMSInboxPage: React.FC = () => {
    const [conversations, setConversations] = useState<{ phoneNumber: string; lastMessage: SMSLog; messageCount: number }[]>([]);
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
    const [thread, setThread] = useState<SMSLog[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (selectedNumber) {
            loadThread(selectedNumber);
        }
    }, [selectedNumber]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const data = await TelephonyService.getSMSConversations();
            setConversations(data);
        } catch {
            toast.error('Błąd ładowania SMS');
        } finally {
            setLoading(false);
        }
    };

    const loadThread = async (phoneNumber: string) => {
        try {
            const data = await TelephonyService.getSMSThread(phoneNumber);
            setThread(data);
        } catch {
            toast.error('Błąd ładowania wątku');
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedNumber) return;
        setSending(true);
        try {
            await TelephonyService.sendSMS(selectedNumber, newMessage, '');
            setNewMessage('');
            loadThread(selectedNumber);
            loadConversations();
            toast.success('SMS wysłany');
        } catch (e: any) {
            toast.error(e.message || 'Błąd wysyłania SMS');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Wiadomości SMS</h1>
                <p className="text-slate-500 text-sm mt-1">Konwersacje SMS z klientami</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                {/* Conversations list */}
                <div className="w-80 border-r border-slate-200 flex flex-col shrink-0">
                    <div className="p-3 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-600">Konwersacje ({conversations.length})</h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Ładowanie...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Brak wiadomości</div>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.phoneNumber}
                                    onClick={() => setSelectedNumber(conv.phoneNumber)}
                                    className={`w-full px-4 py-3 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedNumber === conv.phoneNumber ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-sm text-slate-800 font-mono">{conv.phoneNumber}</p>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(conv.lastMessage.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                        {conv.lastMessage.direction === 'outbound' ? '→ ' : '← '}
                                        {conv.lastMessage.body}
                                    </p>
                                    <span className="text-[10px] text-slate-400">{conv.messageCount} wiadomości</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Thread view */}
                <div className="flex-1 flex flex-col">
                    {selectedNumber ? (
                        <>
                            {/* Thread header */}
                            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-slate-800 font-mono">{selectedNumber}</span>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50">
                                {thread.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${msg.direction === 'outbound'
                                                ? 'bg-blue-600 text-white rounded-br-md'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                                            }`}>
                                            <p>{msg.body}</p>
                                            <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-slate-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                {msg.direction === 'outbound' && (
                                                    <span className="ml-1">
                                                        {msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : msg.status === 'failed' ? '✗' : '⏳'}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Compose */}
                            <div className="p-3 border-t border-slate-200 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Wpisz wiadomość..."
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !newMessage.trim()}
                                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-sm">Wybierz konwersację</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
