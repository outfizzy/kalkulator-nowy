import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ChatMsg {
    id: string;
    role: string;
    content: string | null;
    image_url: string | null;
    image_type: string | null;
    created_at: string;
}

const ROLE_META: Record<string, { label: string; align: 'left' | 'right'; bg: string; color: string }> = {
    user: { label: 'Kunde', align: 'right', bg: '#2563eb', color: '#ffffff' },
    assistant: { label: 'Max (KI-Berater)', align: 'left', bg: '#f1f5f9', color: '#0f172a' },
    agent: { label: 'Mitarbeiter', align: 'left', bg: '#dcfce7', color: '#14532d' },
};

/**
 * Shows the Max (chat-bot) conversation for a lead as a proper thread — so the
 * rep has the full customer context. Loads live from the shared Supabase
 * (max_chat_sessions linked by lead_id → max_chat_messages). Renders nothing for
 * leads without a chat (e.g. form/fair leads).
 */
export function ChatConversationWidget({ leadId, sessionId }: { leadId: string; sessionId?: string | null }) {
    const [messages, setMessages] = useState<ChatMsg[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                let sid = sessionId || null;
                if (!sid) {
                    const { data: sess } = await supabase
                        .from('max_chat_sessions')
                        .select('id, created_at')
                        .eq('lead_id', leadId)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    sid = sess && sess[0] ? (sess[0] as { id: string }).id : null;
                }
                if (!sid) {
                    if (!cancelled) { setMessages([]); setLoading(false); }
                    return;
                }
                const { data } = await supabase
                    .from('max_chat_messages')
                    .select('id, role, content, image_url, image_type, created_at')
                    .eq('session_id', sid)
                    .order('created_at', { ascending: true });
                if (!cancelled) { setMessages((data as ChatMsg[]) || []); setLoading(false); }
            } catch {
                if (!cancelled) { setMessages([]); setLoading(false); }
            }
        })();
        return () => { cancelled = true; };
    }, [leadId, sessionId]);

    // Nothing to show (not a chat lead, or still loading) → stay invisible.
    if (loading || !messages || messages.length === 0) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span>💬</span> Chat-Verlauf (Max KI-Berater)
                <span className="text-xs font-normal text-slate-400">· {messages.length} Nachrichten</span>
            </h3>
            <div className="space-y-2.5 max-h-[30rem] overflow-y-auto pr-1">
                {messages.map((m) => {
                    const meta = ROLE_META[m.role] || ROLE_META.assistant;
                    return (
                        <div key={m.id} className="flex flex-col" style={{ alignItems: meta.align === 'right' ? 'flex-end' : 'flex-start' }}>
                            <span className="text-[10px] text-slate-400 mb-0.5">
                                {meta.label} · {new Date(m.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div
                                className="max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm"
                                style={{ background: meta.bg, color: meta.color, borderRadius: meta.align === 'right' ? '16px 16px 4px 16px' : '16px 16px 16px 4px' }}
                            >
                                {m.image_url && (
                                    <a href={m.image_url} target="_blank" rel="noreferrer" className="block mb-1.5">
                                        <img
                                            src={m.image_url}
                                            alt={m.image_type === 'visualization' ? 'KI-Visualisierung' : 'Kundenfoto'}
                                            className="max-w-full rounded-lg"
                                            style={{ maxHeight: '15rem', display: 'block' }}
                                        />
                                        <span className="text-[10px] opacity-70">
                                            {m.image_type === 'visualization' ? '🎨 KI-Visualisierung' : '📷 Kundenfoto'} · zum Vergrößern klicken
                                        </span>
                                    </a>
                                )}
                                {m.content && <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
