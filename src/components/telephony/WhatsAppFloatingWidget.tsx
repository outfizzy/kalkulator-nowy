import React, { useEffect, useState, useRef } from 'react';
import { TelephonyService, type SMSLog } from '../../services/database/telephony.service';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const WA_GREEN = '#25D366';
const WA_DARK = '#111B21';
const WA_SIDEBAR = '#202C33';
const WA_OUTGOING = '#005C4B';
const WA_INCOMING = '#202C33';

export const WhatsAppFloatingWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState<{ phoneNumber: string; lastMessage: SMSLog; messageCount: number }[]>([]);
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [thread, setThread] = useState<SMSLog[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastSeenId, setLastSeenId] = useState<string | null>(null);
    const [animateBadge, setAnimateBadge] = useState(false);
    const threadEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load conversations
    const loadConversations = async () => {
        try {
            const data = await TelephonyService.getWhatsAppConversations();
            setConversations(data);
        } catch (e) { console.error(e); }
    };

    // Load thread for selected phone
    const loadThread = async (phone: string) => {
        setSelectedPhone(phone);
        setThreadLoading(true);
        try {
            const data = await TelephonyService.getWhatsAppThread(phone);
            setThread(data);
            // Mark as read
            if (data.length > 0) setLastSeenId(data[data.length - 1].id);
        } catch (e) { console.error(e); }
        finally { setThreadLoading(false); }
    };

    // Send message
    const handleSend = async () => {
        if (!newMessage.trim() || !selectedPhone) return;
        setSending(true);
        try {
            const numbers = await TelephonyService.getPhoneNumbers();
            const waNum = numbers.find(n => n.is_active && n.capabilities?.sms);
            if (!waNum) throw new Error('Brak aktywnego numeru');
            await TelephonyService.sendWhatsApp(selectedPhone, newMessage.trim(), waNum.id);
            setNewMessage('');
            await loadThread(selectedPhone);
            await loadConversations();
        } catch (e: any) { toast.error(e.message || 'Błąd wysyłania'); }
        finally { setSending(false); }
    };

    // Scroll to bottom on new messages
    useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

    // Initial load
    useEffect(() => { loadConversations(); }, []);

    // Real-time subscription for incoming WhatsApp messages
    useEffect(() => {
        const channel = supabase
            .channel('whatsapp-widget-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'sms_logs',
                filter: 'channel=eq.whatsapp',
            }, (payload: any) => {
                const msg = payload.new;
                if (msg.direction === 'inbound') {
                    // Play notification sound
                    try {
                        if (!audioRef.current) {
                            audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19teleXBldGVzdAAAA==');
                        }
                        // Simple beep via Web Audio API
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.value = 800;
                        gain.gain.value = 0.15;
                        osc.start();
                        osc.stop(ctx.currentTime + 0.15);
                        setTimeout(() => {
                            const osc2 = ctx.createOscillator();
                            const gain2 = ctx.createGain();
                            osc2.connect(gain2);
                            gain2.connect(ctx.destination);
                            osc2.frequency.value = 1000;
                            gain2.gain.value = 0.15;
                            osc2.start();
                            osc2.stop(ctx.currentTime + 0.15);
                        }, 180);
                    } catch { }

                    // Update unread count
                    setUnreadCount(prev => prev + 1);
                    setAnimateBadge(true);
                    setTimeout(() => setAnimateBadge(false), 600);

                    // Show toast
                    const from = msg.from_number?.replace('whatsapp:', '') || 'Unbekannt';
                    toast((t) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => { setIsOpen(true); loadThread(from); toast.dismiss(t.id); }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: WA_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '13px' }}>WhatsApp von {from}</div>
                                <div style={{ fontSize: '12px', color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.body}</div>
                            </div>
                        </div>
                    ), { duration: 6000, position: 'top-right' });

                    // Refresh
                    loadConversations();
                    if (selectedPhone === from) loadThread(from);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedPhone]);

    // Reset unread when opening widget
    useEffect(() => {
        if (isOpen) setUnreadCount(0);
    }, [isOpen]);

    const timeStr = (d: string) => new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    return (
        <>
            {/* ═══ FLOATING BUTTON ═══ */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: '100px', right: '24px', zIndex: 9998,
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: isOpen ? WA_DARK : WA_GREEN,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    transition: 'all 0.2s ease',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)',
                }}
            >
                {isOpen ? (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                )}
                {/* Unread badge */}
                {unreadCount > 0 && !isOpen && (
                    <div style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: '#EF4444', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        border: '2px solid white',
                        animation: animateBadge ? 'wa-bounce 0.5s ease' : 'none',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {/* ═══ CHAT PANEL ═══ */}
            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '170px', right: '24px', zIndex: 9997,
                    width: '380px', height: '520px',
                    borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
                    display: 'flex', flexDirection: 'column',
                    background: WA_DARK,
                    animation: 'wa-slideUp 0.25s ease',
                }}>
                    {/* Panel Header */}
                    <div style={{ padding: '12px 16px', background: WA_SIDEBAR, display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #313D45' }}>
                        {selectedPhone ? (
                            <>
                                <button onClick={() => { setSelectedPhone(null); setThread([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#AEBAC1"><path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z" /></svg>
                                </button>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6B7B8D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg viewBox="0 0 212 212" width="32" height="32"><path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z" /><path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 00-2.065-2.955 67.7 67.7 0 00-17.97-18.508 67.776 67.776 0 00-24.395-11.185 27.134 27.134 0 007.983-5.488 27.225 27.225 0 007.983-19.238c0-7.54-3.05-14.38-7.993-19.317a27.17 27.17 0 00-19.226-7.959c-7.529 0-14.37 3.05-19.308 7.993-4.94 4.938-7.993 11.786-7.993 19.283 0 7.53 3.05 14.38 7.984 19.317a27.142 27.142 0 007.996 5.488 67.79 67.79 0 00-24.395 11.185A67.618 67.618 0 0064.19 168.66c-.728 1.032-1.42 2.088-2.074 3.165a106.398 106.398 0 0044.135 9.59 106.394 106.394 0 0044.135-9.59z" /></svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#E9EDEF', fontSize: '14px', fontWeight: 500, fontFamily: 'monospace' }}>{selectedPhone}</div>
                                    <div style={{ color: '#8696A0', fontSize: '11px' }}>{thread.length} Nachrichten</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: WA_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                                </div>
                                <div>
                                    <div style={{ color: '#E9EDEF', fontSize: '14px', fontWeight: 600 }}>WhatsApp</div>
                                    <div style={{ color: '#8696A0', fontSize: '11px' }}>{conversations.length} Chats</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Content */}
                    {!selectedPhone ? (
                        /* Conversation List */
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {conversations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8696A0', fontSize: '13px' }}>Keine WhatsApp-Nachrichten</div>
                            ) : (
                                conversations.map(conv => {
                                    const isInbound = conv.lastMessage.direction === 'inbound';
                                    return (
                                        <div
                                            key={conv.phoneNumber}
                                            onClick={() => loadThread(conv.phoneNumber)}
                                            style={{
                                                display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '10px',
                                                cursor: 'pointer', borderBottom: '1px solid #222D34',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#202C33')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6B7B8D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <svg viewBox="0 0 212 212" width="40" height="40"><path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z" /><path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 00-2.065-2.955 67.7 67.7 0 00-17.97-18.508 67.776 67.776 0 00-24.395-11.185 27.134 27.134 0 007.983-5.488 27.225 27.225 0 007.983-19.238c0-7.54-3.05-14.38-7.993-19.317a27.17 27.17 0 00-19.226-7.959c-7.529 0-14.37 3.05-19.308 7.993-4.94 4.938-7.993 11.786-7.993 19.283 0 7.53 3.05 14.38 7.984 19.317a27.142 27.142 0 007.996 5.488 67.79 67.79 0 00-24.395 11.185A67.618 67.618 0 0064.19 168.66c-.728 1.032-1.42 2.088-2.074 3.165a106.398 106.398 0 0044.135 9.59 106.394 106.394 0 0044.135-9.59z" /></svg>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#E9EDEF', fontSize: '14px', fontFamily: 'monospace' }}>{conv.phoneNumber}</span>
                                                    <span style={{ color: isInbound ? WA_GREEN : '#8696A0', fontSize: '11px' }}>{timeStr(conv.lastMessage.created_at)}</span>
                                                </div>
                                                <div style={{ color: '#8696A0', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                                    {conv.lastMessage.body?.substring(0, 45)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        /* Thread View */
                        <>
                            <div style={{
                                flex: 1, overflowY: 'auto', padding: '12px 14px',
                                background: '#0B141A',
                            }}>
                                {threadLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#8696A0' }}>
                                        <div style={{ width: '24px', height: '24px', border: '3px solid #374045', borderTop: `3px solid ${WA_GREEN}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                                    </div>
                                ) : (
                                    thread.map(msg => {
                                        const isOut = msg.direction === 'outbound';
                                        return (
                                            <div key={msg.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: '3px' }}>
                                                <div style={{
                                                    maxWidth: '80%', padding: '5px 7px 3px 8px', borderRadius: '7px',
                                                    borderTopLeftRadius: !isOut ? '0' : '7px', borderTopRightRadius: isOut ? '0' : '7px',
                                                    background: isOut ? WA_OUTGOING : WA_INCOMING,
                                                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                                }}>
                                                    {msg.media_urls?.map((url, i) => (
                                                        <img key={i} src={url} alt="" style={{ maxWidth: '100%', borderRadius: '4px', marginBottom: '4px' }} />
                                                    ))}
                                                    <span style={{ color: '#E9EDEF', fontSize: '13px', lineHeight: '18px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</span>
                                                    <span style={{ float: 'right', marginLeft: '8px', marginTop: '2px', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                                        {timeStr(msg.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={threadEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: '6px 8px', background: WA_SIDEBAR, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                    placeholder="Nachricht..."
                                    style={{
                                        flex: 1, background: '#2A3942', border: 'none', borderRadius: '8px',
                                        color: '#E9EDEF', fontSize: '13px', padding: '10px 12px', outline: 'none',
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !newMessage.trim()}
                                    style={{
                                        background: 'none', border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
                                        padding: '6px', opacity: newMessage.trim() ? 1 : 0.4,
                                    }}
                                >
                                    {sending ? (
                                        <div style={{ width: '20px', height: '20px', border: '2px solid #374045', borderTop: `2px solid ${WA_GREEN}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="22" height="22" fill="#8696A0"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" /></svg>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Animations */}
            <style>{`
                @keyframes wa-slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes wa-bounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.3); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
};
