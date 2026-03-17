import React, { useEffect, useState, useRef, useMemo } from 'react';
import { TelephonyService, type SMSLog } from '../../services/database/telephony.service';
import { CustomerService } from '../../services/database/customer.service';
import type { Customer } from '../../types';
import toast from 'react-hot-toast';

const WA_GREEN = '#25D366';
const WA_DARK = '#111B21';
const WA_SIDEBAR = '#202C33';
const WA_CHAT_BG = '#0B141A';
const WA_INCOMING = '#202C33';
const WA_OUTGOING = '#005C4B';
const WA_HEADER = '#202C33';
const WA_INPUT_BG = '#2A3942';
const WA_SEARCH = '#2A3942';

const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" fill="white" width={size} height={size}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const DoubleCheck = () => (
    <svg viewBox="0 0 16 11" width="16" height="11" fill="none">
        <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.011-2.095a.46.46 0 00-.31-.178.478.478 0 00-.382.126.453.453 0 00-.126.37c.016.14.076.267.178.381l2.38 2.48c.103.103.229.178.381.178.153 0 .293-.063.381-.178l6.53-8.082a.453.453 0 00.102-.381.493.493 0 00-.248-.333z" fill="#53BDEB" />
        <path d="M14.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-1.2-1.25-.762.94 1.58 1.65c.103.103.229.178.381.178.153 0 .293-.063.381-.178l6.53-8.082a.453.453 0 00.102-.381.493.493 0 00-.137-.59z" fill="#53BDEB" />
    </svg>
);

// German templates
const templates = [
    { emoji: '👋', label: 'Begrüßung', text: 'Guten Tag! Hier ist Polendach24. Vielen Dank für Ihr Interesse! Wie können wir Ihnen weiterhelfen?' },
    { emoji: '📄', label: 'Angebot gesendet', text: 'Guten Tag, wir haben Ihnen soeben ein individuelles Angebot per E-Mail zugesendet. Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung. Mit freundlichen Grüßen, Polendach24' },
    { emoji: '📅', label: 'Terminbestätigung', text: 'Guten Tag, hiermit bestätigen wir Ihren Termin. Sollten Sie Änderungswünsche haben, können Sie uns hier direkt schreiben. Mit freundlichen Grüßen, Polendach24' },
    { emoji: '📞', label: 'Rückruf', text: 'Guten Tag, leider konnten wir Ihren Anruf nicht entgegennehmen. Wann dürfen wir Sie zurückrufen? Mit freundlichen Grüßen, Polendach24' },
    { emoji: '📸', label: 'Fotos anfordern', text: 'Guten Tag, könnten Sie uns bitte Fotos von der Einbausituation zusenden? (z.B. Hauswand, Dachbereich, Terrasse). Dies hilft uns bei der Angebotserstellung. Vielen Dank!' },
    { emoji: '✅', label: 'Auftragsbestätigung', text: 'Guten Tag, vielen Dank für Ihren Auftrag! Wir werden uns in Kürze bezüglich des Montagetermins bei Ihnen melden. Mit freundlichen Grüßen, Polendach24' },
];

// Phone normalization for matching
function normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '').replace(/^0049/, '49').replace(/^0/, '49');
}

export const WhatsAppInboxPage: React.FC = () => {
    const [conversations, setConversations] = useState<{ phoneNumber: string; lastMessage: SMSLog; messageCount: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [thread, setThread] = useState<SMSLog[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [newChatPhone, setNewChatPhone] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const threadEndRef = useRef<HTMLDivElement>(null);
    const phoneNumber = '+4915888649130';

    // CRM Contacts
    const [contacts, setContacts] = useState<Customer[]>([]);
    const [contactsLoading, setContactsLoading] = useState(true);
    const [contactSearch, setContactSearch] = useState('');
    const [showContacts, setShowContacts] = useState(false); // Mobile toggle

    // Mobile: show sidebar or chat (not both)
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

    useEffect(() => { loadConversations(); loadContacts(); }, []);
    useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

    const loadContacts = async () => {
        setContactsLoading(true);
        try {
            const data = await CustomerService.getCustomers();
            // Only keep contacts with a phone number
            setContacts(data.filter(c => c.phone && c.phone.trim()));
        } catch (e) { console.error(e); }
        finally { setContactsLoading(false); }
    };

    // Phone-to-contact name map for quick lookup
    const phoneToContact = useMemo(() => {
        const map = new Map<string, Customer>();
        contacts.forEach(c => {
            if (c.phone) {
                map.set(normalizePhone(c.phone), c);
            }
        });
        return map;
    }, [contacts]);

    // Resolve a phone number to a contact name
    const resolveContact = (phone: string): Customer | undefined => {
        return phoneToContact.get(normalizePhone(phone));
    };

    const loadConversations = async () => {
        setLoading(true);
        try {
            const data = await TelephonyService.getWhatsAppConversations();
            setConversations(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadThread = async (phone: string) => {
        setSelectedPhone(phone);
        setMobileView('chat');
        setShowContacts(false);
        setThreadLoading(true);
        setShowNewChat(false);
        try {
            const data = await TelephonyService.getWhatsAppThread(phone);
            setThread(data);
        } catch (e) { console.error(e); }
        finally { setThreadLoading(false); }
    };

    const handleSend = async (targetPhone?: string) => {
        const phone = targetPhone || selectedPhone;
        if (!newMessage.trim() || !phone) return;
        setSending(true);
        try {
            const numbers = await TelephonyService.getPhoneNumbers();
            const waNum = numbers.find(n => n.is_active && n.capabilities?.sms);
            if (!waNum) throw new Error('Brak aktywnego numeru');
            await TelephonyService.sendWhatsApp(phone, newMessage.trim(), waNum.id);
            toast.success('WhatsApp wysłany ✓');
            setNewMessage('');
            setShowTemplates(false);
            if (targetPhone) {
                setSelectedPhone(targetPhone);
                setShowNewChat(false);
                setNewChatPhone('');
            }
            await loadConversations();
            await loadThread(phone);
        } catch (e: any) {
            toast.error(e.message || 'Błąd wysyłania WhatsApp');
        } finally { setSending(false); }
    };

    const timeFormat = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays === 0) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Gestern';
        if (diffDays < 7) return d.toLocaleDateString('de-DE', { weekday: 'short' });
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const filteredConvos = conversations.filter(c => {
        const contact = resolveContact(c.phoneNumber);
        const contactName = contact ? `${contact.firstName} ${contact.lastName}` : '';
        return c.phoneNumber.includes(searchQuery) ||
            c.lastMessage.body?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contactName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredContacts = contacts.filter(c => {
        const q = contactSearch.toLowerCase();
        if (!q) return true;
        return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
            c.phone.includes(contactSearch) ||
            (c.companyName || '').toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q);
    });

    const handleBackToSidebar = () => {
        setMobileView('sidebar');
        setSelectedPhone(null);
    };

    const startChatWithContact = (contact: Customer) => {
        const phone = contact.phone.replace(/[^0-9+]/g, '');
        // Check if a conversation with this phone already exists
        const existing = conversations.find(c => normalizePhone(c.phoneNumber) === normalizePhone(phone));
        if (existing) {
            loadThread(existing.phoneNumber);
        } else {
            // Open new chat panel with pre-filled phone
            setShowNewChat(true);
            setNewChatPhone(phone.startsWith('+') ? phone : `+${phone}`);
            setMobileView('sidebar');
            setShowContacts(false);
        }
    };

    // Count stats
    const totalConversations = conversations.length;
    const unreadCount = conversations.filter(c => c.lastMessage.direction === 'inbound').length;

    return (
        <div className="wa-container" style={{ height: 'calc(100vh - 130px)', display: 'flex', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
            {/* ══════ LEFT SIDEBAR — CHATS ══════ */}
            <div
                className="wa-sidebar"
                style={{
                    width: '380px', minWidth: '380px', background: WA_SIDEBAR,
                    display: 'flex', flexDirection: 'column', borderRight: '1px solid #313D45',
                }}
            >
                {/* Header */}
                <div style={{ padding: '10px 16px', background: WA_HEADER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #313D45' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: WA_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <WhatsAppIcon size={24} />
                        </div>
                        <div>
                            <div style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: 600 }}>WhatsApp Business</div>
                            <div style={{ color: '#8696A0', fontSize: '12px', fontFamily: 'monospace' }}>{phoneNumber}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={() => setShowContacts(!showContacts)}
                            style={{ background: showContacts ? '#374045' : 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: 'background 0.2s' }}
                            onMouseEnter={e => !showContacts && (e.currentTarget.style.background = '#374045')}
                            onMouseLeave={e => !showContacts && (e.currentTarget.style.background = 'none')}
                            title="Kontakty CRM"
                        >
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="#AEBAC1">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setShowNewChat(!showNewChat)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#374045')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            title="Nowa rozmowa"
                        >
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="#AEBAC1">
                                <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div style={{ padding: '6px 16px', background: '#182229', display: 'flex', gap: '12px', borderBottom: '1px solid #313D45', fontSize: '11px' }}>
                    <span style={{ color: '#8696A0' }}>Rozmowy: <strong style={{ color: '#E9EDEF' }}>{totalConversations}</strong></span>
                    {unreadCount > 0 && (
                        <span style={{ color: WA_GREEN }}>Nowe: <strong>{unreadCount}</strong></span>
                    )}
                    <span style={{ color: '#8696A0' }}>Kontakty: <strong style={{ color: '#E9EDEF' }}>{contacts.length}</strong></span>
                </div>

                {/* Search */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #313D45' }}>
                    <div style={{ background: WA_SEARCH, borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '12px' }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="#8696A0">
                            <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 001.256-3.386 5.207 5.207 0 10-5.207 5.208 5.183 5.183 0 003.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 11.001-7.21 3.605 3.605 0 010 7.21z" />
                        </svg>
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Szukaj rozmów lub kontaktów..."
                            style={{ background: 'none', border: 'none', color: '#E9EDEF', fontSize: '14px', padding: '9px 0', width: '100%', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* New Chat Panel */}
                {showNewChat && (
                    <div style={{ padding: '12px', background: '#182229', borderBottom: '1px solid #313D45' }}>
                        <div style={{ color: '#8696A0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Nowa rozmowa WhatsApp</div>
                        <input
                            value={newChatPhone}
                            onChange={e => setNewChatPhone(e.target.value)}
                            placeholder="+49..."
                            style={{ width: '100%', background: WA_SEARCH, border: 'none', borderRadius: '8px', color: '#E9EDEF', padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'monospace' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <input
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Pierwsza wiadomość..."
                                style={{ flex: 1, background: WA_SEARCH, border: 'none', borderRadius: '8px', color: '#E9EDEF', padding: '10px 14px', fontSize: '14px', outline: 'none' }}
                                onKeyDown={e => e.key === 'Enter' && handleSend(newChatPhone)}
                            />
                            <button
                                onClick={() => handleSend(newChatPhone)}
                                disabled={sending || !newChatPhone.trim() || !newMessage.trim()}
                                style={{ background: WA_GREEN, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending || !newChatPhone.trim() || !newMessage.trim() ? 0.5 : 1, flexShrink: 0 }}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M1.1 21.757l22.7-9.73L1.1 2.3l.012 7.912 13.623 1.816-13.623 1.817-.012 7.912z" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Conversations */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#8696A0', fontSize: '14px' }}>
                            <div style={{ width: '30px', height: '30px', border: '3px solid #374045', borderTop: `3px solid ${WA_GREEN}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                            Ładowanie czatów...
                        </div>
                    ) : filteredConvos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8696A0' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#182229', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <WhatsAppIcon size={40} />
                            </div>
                            <div style={{ fontSize: '14px', marginBottom: '4px' }}>Brak czatów</div>
                            <div style={{ fontSize: '12px', color: '#667781' }}>Rozpocznij nową rozmowę</div>
                        </div>
                    ) : (
                        filteredConvos.map(conv => {
                            const isSelected = selectedPhone === conv.phoneNumber;
                            const isInbound = conv.lastMessage.direction === 'inbound';
                            const contact = resolveContact(conv.phoneNumber);
                            const displayName = contact ? `${contact.firstName} ${contact.lastName}` : conv.phoneNumber;
                            return (
                                <div
                                    key={conv.phoneNumber}
                                    onClick={() => loadThread(conv.phoneNumber)}
                                    style={{
                                        display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px',
                                        cursor: 'pointer', transition: 'background 0.15s',
                                        background: isSelected ? '#2A3942' : 'transparent',
                                        borderBottom: '1px solid #222D34',
                                    }}
                                    onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#202C33')}
                                    onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                                >
                                    {/* Avatar */}
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: contact ? '#00A884' : '#6B7B8D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontWeight: 700, fontSize: '16px' }}>
                                        {contact ? (
                                            <span>{contact.firstName[0]}{contact.lastName[0]}</span>
                                        ) : (
                                            <svg viewBox="0 0 212 212" width="48" height="48">
                                                <path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z" />
                                                <path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 00-2.065-2.955 67.7 67.7 0 00-17.97-18.508 67.776 67.776 0 00-24.395-11.185 27.134 27.134 0 007.983-5.488 27.225 27.225 0 007.983-19.238c0-7.54-3.05-14.38-7.993-19.317a27.17 27.17 0 00-19.226-7.959c-7.529 0-14.37 3.05-19.308 7.993-4.94 4.938-7.993 11.786-7.993 19.283 0 7.53 3.05 14.38 7.984 19.317a27.142 27.142 0 007.996 5.488 67.79 67.79 0 00-24.395 11.185A67.618 67.618 0 0064.19 168.66c-.728 1.032-1.42 2.088-2.074 3.165a106.398 106.398 0 0044.135 9.59 106.394 106.394 0 0044.135-9.59 67.663 67.663 0 0023.175.79z" />
                                            </svg>
                                        )}
                                    </div>
                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                            <span style={{ color: '#E9EDEF', fontSize: contact ? '15px' : '14px', fontWeight: contact ? 500 : 400, fontFamily: contact ? 'inherit' : 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {displayName}
                                            </span>
                                            <span style={{ color: isInbound ? WA_GREEN : '#8696A0', fontSize: '12px', flexShrink: 0, marginLeft: '8px' }}>{timeFormat(conv.lastMessage.created_at)}</span>
                                        </div>
                                        {contact && (
                                            <div style={{ color: '#667781', fontSize: '11px', marginBottom: '1px', fontFamily: 'monospace' }}>{conv.phoneNumber}</div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {!isInbound && <DoubleCheck />}
                                            <span style={{ color: '#8696A0', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {conv.lastMessage.body?.substring(0, 50)}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Unread badge for inbound */}
                                    {isInbound && (
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: WA_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: WA_DARK, flexShrink: 0 }}>
                                            {conv.messageCount > 9 ? '9+' : conv.messageCount}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ══════ CENTER — CHAT AREA ══════ */}
            <div className="wa-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: WA_CHAT_BG }}>
                {!selectedPhone ? (
                    /* Empty state */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#222E35' }}>
                        <div style={{ maxWidth: '320px', textAlign: 'center', padding: '20px' }}>
                            <div style={{ width: '160px', height: '160px', margin: '0 auto 28px', borderRadius: '50%', background: 'linear-gradient(135deg, #00A884 0%, #25D366 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
                                <WhatsAppIcon size={80} />
                            </div>
                            <h2 style={{ color: '#E9EDEF', fontSize: '24px', fontWeight: 300, marginBottom: '12px' }}>WhatsApp Business</h2>
                            <p style={{ color: '#8696A0', fontSize: '14px', lineHeight: '20px' }}>
                                Wysyłaj i odbieraj wiadomości bezpośrednio przez numer firmowy <strong style={{ color: '#E9EDEF', fontFamily: 'monospace' }}>{phoneNumber}</strong>
                            </p>
                            <div style={{ marginTop: '24px', padding: '12px', background: '#182229', borderRadius: '8px', fontSize: '12px', color: '#667781', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <svg viewBox="0 0 10 12" width="10" height="12" fill="#667781"><path d="M5.004.943C2.264.943.14 3.067.14 5.807c0 1.263.473 2.415 1.252 3.292l.109.119-.462 1.688 1.737-.455.103.062A4.826 4.826 0 005.004 11.1c2.739 0 4.864-2.124 4.864-4.863A4.869 4.869 0 005.004.943z" /></svg>
                                Szyfrowanie end-to-end
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: '10px 16px', background: WA_HEADER, display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #313D45' }}>
                            {/* Back button (mobile) */}
                            <button
                                onClick={handleBackToSidebar}
                                className="wa-back-btn"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'none' }}
                            >
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="#AEBAC1"><path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z" /></svg>
                            </button>
                            {(() => {
                                const contact = resolveContact(selectedPhone);
                                return (
                                    <>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: contact ? '#00A884' : '#6B7B8D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontWeight: 700, fontSize: '14px' }}>
                                            {contact ? <span>{contact.firstName[0]}{contact.lastName[0]}</span> : (
                                                <svg viewBox="0 0 212 212" width="40" height="40">
                                                    <path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z" />
                                                    <path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 00-2.065-2.955 67.7 67.7 0 00-17.97-18.508 67.776 67.776 0 00-24.395-11.185 27.134 27.134 0 007.983-5.488 27.225 27.225 0 007.983-19.238c0-7.54-3.05-14.38-7.993-19.317a27.17 27.17 0 00-19.226-7.959c-7.529 0-14.37 3.05-19.308 7.993-4.94 4.938-7.993 11.786-7.993 19.283 0 7.53 3.05 14.38 7.984 19.317a27.142 27.142 0 007.996 5.488 67.79 67.79 0 00-24.395 11.185A67.618 67.618 0 0064.19 168.66c-.728 1.032-1.42 2.088-2.074 3.165a106.398 106.398 0 0044.135 9.59 106.394 106.394 0 0044.135-9.59 67.663 67.663 0 0023.175.79z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: '#E9EDEF', fontSize: '16px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {contact ? `${contact.firstName} ${contact.lastName}` : selectedPhone}
                                            </div>
                                            <div style={{ color: '#8696A0', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {contact ? (
                                                    <span>{selectedPhone} • {contact.city}{contact.companyName ? ` • ${contact.companyName}` : ''}</span>
                                                ) : (
                                                    thread.length > 0 ? `${thread.length} wiadomości` : 'kliknij, aby zobaczyć info'
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                            {/* Header actions */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={() => {
                                        if (selectedPhone) window.open(`tel:${selectedPhone}`, '_self');
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                                    title="Zadzwoń"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#AEBAC1"><path d="M19.077 15.907c-.63-.327-1.3-.583-1.998-.764l-.377-.104a.85.85 0 00-.788.197l-1.075.92a.79.79 0 01-.845.12 11.556 11.556 0 01-3.18-2.318 11.557 11.557 0 01-2.318-3.18.79.79 0 01.12-.845l.919-1.075a.85.85 0 00.197-.788l-.104-.377c-.181-.699-.437-1.368-.764-1.998a.878.878 0 00-1.074-.432l-1.14.354a2.285 2.285 0 00-1.535 2.634 14.506 14.506 0 003.564 7.157 14.507 14.507 0 007.157 3.564 2.285 2.285 0 002.634-1.535l.354-1.14a.878.878 0 00-.432-1.074z" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{
                            flex: 1, overflowY: 'auto', padding: '20px',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='430' height='430' viewBox='0 0 50 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M25 10c-1 0-2.5 1-3 2l-1 3c-.5 1-2 2-3 2s-2-.5-3-1l-2-2c-1-1-2-1-3 0l-1 1c-.5.5-.5 1.5 0 2l2 2c1 1 1 2.5 1 3.5s-1 2.5-2 3L6 27c-1 .5-1.5 1.5-1 2.5l.5 1c.5 1 1.5 1 2.5.5l3-1c1-.5 2.5-.5 3.5 0s2 1.5 2.5 2.5l1 3c.5 1 1.5 1.5 2.5 1h1c1 0 2-.5 2.5-1.5l1-3c.5-1 1.5-2 2.5-2.5s2.5-.5 3.5 0l3 1c1 .5 2 0 2.5-.5l.5-1c.5-1 0-2-1-2.5l-3-1c-1-.5-2-1.5-2-3s.5-2.5 1-3.5l2-2c.5-.5.5-1.5 0-2l-1-1c-1-1-2-1-3 0l-2 2c-1 1-2 1-3 1s-2.5-1-3-2l-1-3c-.5-1-2-2-3-2z'/%3E%3C/g%3E%3C/svg%3E")`,
                            backgroundColor: '#0B141A',
                        }}>
                            {threadLoading ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#8696A0' }}>
                                    <div style={{ width: '30px', height: '30px', border: '3px solid #374045', borderTop: `3px solid ${WA_GREEN}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                                </div>
                            ) : thread.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px' }}>
                                    <div style={{ background: '#1D2B36', borderRadius: '8px', padding: '8px 12px', display: 'inline-block', fontSize: '12px', color: '#FFD279', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                        🔒 Wiadomości zaszyfrowane end-to-end. Nikt poza uczestnikami czatu nie może ich odczytać.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Date separator */}
                                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                        <span style={{ background: '#182229', color: '#8696A0', fontSize: '12px', padding: '5px 12px', borderRadius: '8px', boxShadow: '0 1px 1px rgba(0,0,0,0.15)' }}>
                                            {new Date(thread[0]?.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    {thread.map(msg => {
                                        const isOut = msg.direction === 'outbound';
                                        return (
                                            <div key={msg.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
                                                <div style={{
                                                    maxWidth: '75%', padding: '6px 7px 8px 9px', borderRadius: '8px',
                                                    borderTopLeftRadius: !isOut ? '0' : '8px', borderTopRightRadius: isOut ? '0' : '8px',
                                                    background: isOut ? WA_OUTGOING : WA_INCOMING,
                                                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                                    position: 'relative',
                                                }}>
                                                    <span style={{ color: '#E9EDEF', fontSize: '14.2px', lineHeight: '19px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {msg.body}
                                                    </span>
                                                    {msg.media_urls && msg.media_urls.length > 0 && (
                                                        <div style={{ marginTop: '6px' }}>
                                                            {msg.media_urls.map((url, i) => (
                                                                <img key={i} src={url} alt="media" style={{ maxWidth: '100%', borderRadius: '6px', marginBottom: '4px' }} />
                                                            ))}
                                                        </div>
                                                    )}
                                                    <span style={{ float: 'right', marginLeft: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <span style={{ color: isOut ? 'rgba(255,255,255,0.45)' : '#8696A0', fontSize: '11px' }}>
                                                            {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isOut && <DoubleCheck />}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            <div ref={threadEndRef} />
                        </div>

                        {/* Templates bar */}
                        {showTemplates && (
                            <div style={{ padding: '8px 16px', background: '#182229', borderTop: '1px solid #313D45', display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
                                {templates.map((tpl, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setNewMessage(tpl.text); setShowTemplates(false); }}
                                        style={{
                                            background: '#2A3942', border: '1px solid #374045', borderRadius: '20px',
                                            color: '#E9EDEF', padding: '6px 14px', fontSize: '13px', cursor: 'pointer',
                                            whiteSpace: 'nowrap', transition: 'background 0.15s', flexShrink: 0,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#374045')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#2A3942')}
                                    >
                                        {tpl.emoji} {tpl.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input area */}
                        <div style={{ padding: '6px 10px', background: WA_HEADER, display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setShowTemplates(!showTemplates)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', flexShrink: 0 }}
                                title="Szablony"
                            >
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="#8696A0">
                                    <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.858 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-2.928 5.078c2.937 0 5.217-1.73 5.768-4.402H6.315c.551 2.672 2.831 4.402 5.768 4.402z" />
                                    <path d="M12.003 2C6.478 2 2 6.477 2 12c0 5.522 4.478 10 10.003 10 5.523 0 9.997-4.478 9.997-10 0-5.523-4.474-10-9.997-10zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" />
                                </svg>
                            </button>
                            <div style={{ flex: 1, background: WA_INPUT_BG, borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px', minHeight: '42px' }}>
                                <textarea
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Wpisz wiadomość..."
                                    rows={1}
                                    style={{
                                        background: 'none', border: 'none', color: '#E9EDEF', fontSize: '15px',
                                        width: '100%', outline: 'none', resize: 'none', padding: '10px 0',
                                        maxHeight: '100px', lineHeight: '20px', fontFamily: 'inherit',
                                    }}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                />
                            </div>
                            <button
                                onClick={() => handleSend()}
                                disabled={sending || !newMessage.trim()}
                                style={{
                                    background: 'none', border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
                                    padding: '8px', flexShrink: 0, opacity: newMessage.trim() ? 1 : 0.5,
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                {sending ? (
                                    <div style={{ width: '24px', height: '24px', border: '3px solid #374045', borderTop: `3px solid ${WA_GREEN}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="#8696A0">
                                        <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ══════ RIGHT SIDEBAR — CRM CONTACTS ══════ */}
            <div
                className="wa-contacts"
                style={{
                    width: '300px', minWidth: '300px', background: '#1A252D',
                    display: showContacts ? 'flex' : 'none',
                    flexDirection: 'column', borderLeft: '1px solid #313D45',
                }}
            >
                {/* Header */}
                <div style={{ padding: '12px 16px', background: WA_HEADER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #313D45' }}>
                    <div style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill={WA_GREEN}>
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        Kontakty CRM
                    </div>
                    <button
                        onClick={() => setShowContacts(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696A0"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                    </button>
                </div>

                {/* Contact Search */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #313D45' }}>
                    <div style={{ background: WA_SEARCH, borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#8696A0">
                            <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 001.256-3.386 5.207 5.207 0 10-5.207 5.208 5.183 5.183 0 003.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 11.001-7.21 3.605 3.605 0 010 7.21z" />
                        </svg>
                        <input
                            value={contactSearch}
                            onChange={e => setContactSearch(e.target.value)}
                            placeholder="Szukaj kontaktu..."
                            style={{ background: 'none', border: 'none', color: '#E9EDEF', fontSize: '13px', padding: '8px 0', width: '100%', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Contact List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {contactsLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#8696A0' }}>
                            <div style={{ width: '24px', height: '24px', border: '2px solid #374045', borderTop: `2px solid ${WA_GREEN}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                            <div style={{ fontSize: '12px' }}>Ładowanie...</div>
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#667781', fontSize: '13px' }}>
                            Brak kontaktów z numerem telefonu
                        </div>
                    ) : (
                        filteredContacts.map(contact => {
                            const hasExistingConvo = conversations.some(c => normalizePhone(c.phoneNumber) === normalizePhone(contact.phone));
                            return (
                                <div
                                    key={contact.id || contact.phone}
                                    onClick={() => startChatWithContact(contact)}
                                    style={{
                                        display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '10px',
                                        cursor: 'pointer', transition: 'background 0.15s',
                                        borderBottom: '1px solid #222D34',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#202C33')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        background: hasExistingConvo ? '#00A884' : '#3B4A54',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, color: 'white', fontWeight: 700, fontSize: '12px',
                                    }}>
                                        {contact.firstName[0]}{contact.lastName[0]}
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ color: '#E9EDEF', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {contact.firstName} {contact.lastName}
                                        </div>
                                        <div style={{ color: '#667781', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {contact.phone}
                                        </div>
                                        {contact.city && (
                                            <div style={{ color: '#546067', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {contact.city}{contact.companyName ? ` • ${contact.companyName}` : ''}
                                            </div>
                                        )}
                                    </div>
                                    {/* WhatsApp icon */}
                                    <div style={{ flexShrink: 0, opacity: 0.6 }}>
                                        <WhatsAppIcon size={16} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #313D45', background: '#182229', fontSize: '11px', color: '#667781', textAlign: 'center' }}>
                    {filteredContacts.length} kontaktów z nr telefonu
                </div>
            </div>

            {/* Responsive styles */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Desktop: show both panels */
                @media (min-width: 769px) {
                    .wa-sidebar { display: flex !important; }
                    .wa-chat { display: flex !important; }
                    .wa-back-btn { display: none !important; }
                    .wa-contacts { display: ${showContacts ? 'flex' : 'none'} !important; }
                }

                /* Mobile: show one panel at a time */
                @media (max-width: 768px) {
                    .wa-container {
                        height: calc(100vh - 80px) !important;
                        border-radius: 0 !important;
                    }
                    .wa-sidebar {
                        ${mobileView === 'sidebar' && !showContacts ? 'display: flex !important;' : 'display: none !important;'}
                        width: 100% !important;
                        min-width: 100% !important;
                    }
                    .wa-chat {
                        ${mobileView === 'chat' && !showContacts ? 'display: flex !important;' : 'display: none !important;'}
                    }
                    .wa-contacts {
                        ${showContacts ? 'display: flex !important;' : 'display: none !important;'}
                        width: 100% !important;
                        min-width: 100% !important;
                    }
                    .wa-back-btn {
                        display: flex !important;
                    }
                }
            `}</style>
        </div>
    );
};
