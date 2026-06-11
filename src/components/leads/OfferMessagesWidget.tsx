import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock, ChevronDown, Send } from 'lucide-react';
import { LeadService } from '../../services/database/lead.service';
import { toast } from 'react-hot-toast';

interface LeadMessage {
    id: string;
    content: string;
    senderType: 'client' | 'user';
    isRead: boolean;
    createdAt: Date;
    offerId?: string;
}

function timeAgoMsg(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'gerade';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'gestern';
    return `${days}d`;
}

interface OfferMessagesWidgetProps {
    leadId: string;
}

export const OfferMessagesWidget: React.FC<OfferMessagesWidgetProps> = ({ leadId }) => {
    const [messages, setMessages] = useState<LeadMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);

    const handleSendReply = async () => {
        const content = reply.trim();
        if (content.length < 2 || sending) return;
        setSending(true);
        try {
            await LeadService.sendUserMessage(leadId, content);
            setReply('');
            toast.success('Odpowiedź wysłana — klient zobaczy ją na stronie oferty');
            fetchMessages();
        } catch (e) {
            console.error('[OfferMessagesWidget] Reply error:', e);
            toast.error('Nie udało się wysłać odpowiedzi');
        } finally {
            setSending(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('lead_messages')
                .select('id, content, sender_type, is_read, created_at, offer_id')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            setMessages((data || []).map(m => ({
                id: m.id,
                content: m.content,
                senderType: m.sender_type,
                isRead: m.is_read,
                createdAt: new Date(m.created_at),
                offerId: m.offer_id,
            })));
        } catch (e) {
            console.error('[OfferMessagesWidget] Error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        // Realtime for new messages
        const channel = supabase
            .channel(`lead-messages-${leadId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'lead_messages',
                filter: `lead_id=eq.${leadId}`,
            }, () => fetchMessages())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [leadId]);

    // Mark all as read
    const markAsRead = async () => {
        const unread = messages.filter(m => !m.isRead && m.senderType === 'client');
        if (unread.length === 0) return;
        await supabase
            .from('lead_messages')
            .update({ is_read: true })
            .eq('lead_id', leadId)
            .eq('sender_type', 'client')
            .eq('is_read', false);
        setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    };

    if (loading) return null;
    if (messages.length === 0) return null;

    const unreadCount = messages.filter(m => !m.isRead && m.senderType === 'client').length;
    const displayMessages = expanded ? messages : messages.slice(0, 3);

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                    <div className="relative">
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    Kundennachrichten
                </h3>
                {unreadCount > 0 && (
                    <button
                        onClick={markAsRead}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        Alle gelesen
                    </button>
                )}
            </div>

            <div className="divide-y divide-slate-50">
                {displayMessages.map(msg => (
                    <div
                        key={msg.id}
                        className={`px-4 py-3 ${!msg.isRead && msg.senderType === 'client' ? 'bg-blue-50/50' : ''}`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-bold uppercase ${msg.senderType === 'client' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {msg.senderType === 'client' ? 'Kunde' : 'Mitarbeiter'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {timeAgoMsg(msg.createdAt)}
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{msg.content}</p>
                        {!msg.isRead && msg.senderType === 'client' && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                        )}
                    </div>
                ))}
            </div>

            {messages.length > 3 && (
                <button
                    onClick={() => setExpanded(p => !p)}
                    className="w-full py-2 border-t border-slate-100 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                >
                    <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'Weniger' : `Alle anzeigen (${messages.length})`}
                </button>
            )}

            {/* Odpowiedź handlowca — trafia do lead_messages (sender_type='user'),
                klient widzi ją w wątku na publicznej stronie oferty */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                <div className="flex items-end gap-2">
                    <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendReply();
                        }}
                        placeholder="Odpowiedz klientowi… (widoczne na stronie oferty)"
                        rows={2}
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none bg-white"
                    />
                    <button
                        onClick={handleSendReply}
                        disabled={sending || reply.trim().length < 2}
                        className="shrink-0 h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white flex items-center gap-1.5 text-xs font-bold transition-colors"
                        title="Wyślij odpowiedź (Cmd+Enter)"
                    >
                        <Send className="w-3.5 h-3.5" />
                        {sending ? 'Wysyłam…' : 'Wyślij'}
                    </button>
                </div>
            </div>
        </div>
    );
};
