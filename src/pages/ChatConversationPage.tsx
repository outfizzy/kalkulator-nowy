import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  PanelRight,
  User,
  Ruler,
  LayoutGrid,
  FileText,
  AlertTriangle,
  RefreshCw,
  Euro,
  Sparkles,
  Check,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getSession,
  getSessionMessages,
  takeOverSession,
  sendAgentMessage,
  closeSession,
  markSessionViewed,
  returnToAi,
  getLatestOfferForLead,
  type ChatSession,
  type ChatMessage,
  type LeadOffer,
} from '../services/database/chat.service';

// ═══════════════════════════════════════════════
// Chat Conversation — Full chat view for agents
// ═══════════════════════════════════════════════

export default function ChatConversationPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNearBottomRef = useRef(true);

  // Pricing state (must be before any early returns — Rules of Hooks)
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [pricingNotes, setPricingNotes] = useState('');
  const [pricingSaved, setPricingSaved] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Latest offer for the linked lead (+ re-quote state)
  const [latestOffer, setLatestOffer] = useState<LeadOffer | null>(null);
  const [requoting, setRequoting] = useState(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.full_name) setCurrentUserName(profile.full_name);
          });
      }
    });
  }, []);

  // Load session + messages
  const loadData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [s, m] = await Promise.all([
        getSession(sessionId),
        getSessionMessages(sessionId),
      ]);
      setSession(s);
      setMessages(m);

      // Mark as read — clears the unread badge in the inbox
      markSessionViewed(sessionId);

      // Pull the latest offer for the linked lead (price + status + re-quote)
      if (s?.lead_id) {
        getLatestOfferForLead(s.lead_id)
          .then(setLatestOffer)
          .catch((e) => console.warn('Failed to load latest offer:', e));
      } else {
        setLatestOffer(null);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Track scroll position for smart auto-scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 150;
    isNearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Auto-scroll only when user is near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load pricing data from session metadata
  useEffect(() => {
    if (session?.metadata) {
      const meta = session.metadata as any;
      if (meta.purchasePrice) setPurchasePrice(meta.purchasePrice);
      if (meta.sellingPrice) setSellingPrice(meta.sellingPrice);
      if (meta.pricingNotes) setPricingNotes(meta.pricingNotes);
    }
  }, [session]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`chat-conversation-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'max_chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Deduplicate
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'max_chat_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          setSession(payload.new as ChatSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Take over
  const handleTakeOver = async () => {
    if (!sessionId || !currentUserId || !currentUserName) return;
    const firstName = currentUserName.split(' ')[0];
    const success = await takeOverSession(sessionId, currentUserId, firstName);
    if (success) {
      loadData();
    }
  };

  // Return the chat to Max (AI)
  const handleReturnToAi = async () => {
    if (!sessionId) return;
    if (!window.confirm('Chat an Max (KI) zurueckgeben?')) return;
    const success = await returnToAi(sessionId);
    if (success) {
      toast.success('Chat wurde an Max zurueckgegeben.');
      loadData();
    } else {
      toast.error('Konnte den Chat nicht zurueckgeben.');
    }
  };

  // Re-trigger the offer agent (e.g. when pricing is stuck on "pending")
  const handleRequote = async () => {
    if (!session?.lead_id || requoting) return;
    setRequoting(true);
    const t = toast.loading('Preisberechnung wird neu gestartet...');
    try {
      const { error } = await supabase.functions.invoke('trigger-offer-agent', {
        body: { leadId: session.lead_id },
      });
      if (error) {
        console.error('Re-quote trigger error:', error);
        toast.error('Konnte die Preisberechnung nicht starten: ' + (error.message || 'Unbekannter Fehler'), { id: t });
      } else {
        toast.success('Preisberechnung gestartet. Das Ergebnis erscheint in Kuerze.', { id: t });
      }
    } catch (err) {
      console.error('Re-quote failed:', err);
      toast.error('Konnte die Preisberechnung nicht starten.', { id: t });
    } finally {
      setRequoting(false);
    }
  };

  // Send message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || sending) return;

    setInput('');
    setSending(true);

    try {
      await sendAgentMessage(sessionId, text);
    } catch (err) {
      console.error('Failed to send:', err);
      setInput(text); // Restore on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Close session
  const handleClose = async () => {
    if (!sessionId) return;
    if (!window.confirm('Chat wirklich beenden?')) return;
    await closeSession(sessionId);
    navigate('/chat');
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Heute';
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDateKey = (dateStr: string) => new Date(dateStr).toDateString();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium">Chat nicht gefunden</p>
        <button onClick={() => navigate('/chat')} className="text-blue-500 mt-3 underline">
          Zurueck zur Uebersicht
        </button>
      </div>
    );
  }

  const isTaken = session.status === 'taken';
  const isMine = isTaken && session.taken_by === currentUserId;
  const canWrite = isMine;

  // Agent display name: use session's taken_by_name so all agent messages
  // show the actual agent, not just whoever is currently logged in.
  const agentDisplayName = session.taken_by_name || currentUserName;
  const agentInitial = agentDisplayName?.[0]?.toUpperCase() || 'A';

  // Save pricing
  const savePricing = async () => {
    if (!sessionId) return;
    try {
      await supabase.from('max_chat_sessions').update({
        metadata: {
          ...(session?.metadata as any || {}),
          purchasePrice,
          sellingPrice,
          pricingNotes,
          pricingUpdatedAt: new Date().toISOString(),
        },
      }).eq('id', sessionId);
      setPricingSaved(true);
      setTimeout(() => setPricingSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save pricing:', e);
    }
  };

  // Extract collected data from messages
  const collectedData = (() => {
    const cd = session?.customer_data || {};
    const allText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
    // Try to extract dimensions from conversation
    const dimMatch = allText.match(/(\d+(?:[.,]\d+)?)\s*(?:m|meter)?\s*(?:x|×|mal|breit|breite)?\s*(?:und|,)?\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter)?/i);
    return {
      name: cd.vorname || session?.customer_name || null,
      plz: cd.plz || null,
      email: cd.email || null,
      phone: cd.telefon || null,
      model: cd.modell || null,
      dimensions: dimMatch ? `${dimMatch[1]} × ${dimMatch[2]} m` : null,
      project: cd.projekt || null,
    };
  })();

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-130px)] flex gap-4">
      {/* ═══ LEFT: Chat Column ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-t-xl px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/chat')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-900">
                {session.customer_name || 'Besucher'}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  session.status === 'ai'
                    ? 'bg-green-100 text-green-700'
                    : session.status === 'taken'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {session.status === 'ai' ? 'Max antwortet' : session.status === 'taken' ? 'Uebernommen' : 'Geschlossen'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
              {session.page_url && <span>{session.page_url}</span>}
              {session.customer_data?.plz && <span>PLZ: {session.customer_data.plz}</span>}
              <span>{formatDate(session.created_at)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center ${showSidebar ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Seitenpanel ein/ausblenden"
            >
              <PanelRight size={16} />
            </button>
            {session.status === 'ai' && (
              <button
                onClick={handleTakeOver}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Uebernehmen
              </button>
            )}
            {session.status === 'taken' && (
              <button
                onClick={handleReturnToAi}
                className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                title="Chat an Max (KI) zurueckgeben"
              >
                An Max zurueckgeben
              </button>
            )}
            {(isMine || session.status !== 'closed') && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Beenden
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-gray-50 border-x border-gray-200 px-6 py-4 space-y-3">
          {messages.map((msg, idx) => {
            // Date separator: show when this message is on a different day than the previous one
            const showDateSep =
              idx === 0 || getDateKey(msg.created_at) !== getDateKey(messages[idx - 1].created_at);

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                {msg.role === 'system' && (
                  <div className="flex justify-center py-2">
                    <div className="bg-gray-200 text-gray-500 text-xs font-medium px-4 py-1.5 rounded-full">
                      {msg.content} · {formatTime(msg.created_at)}
                    </div>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="flex justify-end items-end gap-2">
                    <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                    <div className="max-w-[70%] bg-blue-600 text-white rounded-2xl rounded-br-md overflow-hidden">
                      {msg.image_url && <img src={msg.image_url} alt="Kundenfoto" className="w-full max-h-[250px] object-cover cursor-pointer" onClick={() => window.open(msg.image_url!, '_blank')} />}
                      {msg.content && <div className="px-4 py-2.5 text-sm">{msg.content}</div>}
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="flex justify-start items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">M</div>
                    <div className="max-w-[70%] bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm overflow-hidden">
                      {msg.image_url && <img src={msg.image_url} alt="Bild" className="w-full max-h-[250px] object-cover cursor-pointer" onClick={() => window.open(msg.image_url!, '_blank')} />}
                      {msg.content && <div className="px-4 py-2.5 text-sm text-gray-800">{msg.content}</div>}
                    </div>
                    <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                  </div>
                )}
                {msg.role === 'agent' && (
                  <div className="flex justify-start items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{agentInitial}</div>
                    <div className="max-w-[70%] bg-blue-50 border border-blue-200 rounded-2xl rounded-bl-md overflow-hidden">
                      {msg.content && <div className="px-4 py-2.5 text-sm text-blue-900">{msg.content}</div>}
                    </div>
                    <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border border-gray-200 rounded-b-xl px-6 py-4">
          {canWrite ? (
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Nachricht an den Kunden..."
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-30"
              >
                Senden
              </button>
            </div>
          ) : session.status === 'ai' ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">
                Max antwortet dem Kunden automatisch.{' '}
                <button onClick={handleTakeOver} className="text-blue-600 font-medium hover:underline">Chat uebernehmen?</button>
              </p>
            </div>
          ) : session.status === 'closed' ? (
            <div className="text-center py-2 text-sm text-gray-400">Dieser Chat wurde beendet.</div>
          ) : (
            <div className="text-center py-2 text-sm text-gray-400">Dieser Chat wird von einem anderen Berater betreut.</div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Sidebar — Customer Data + Pricing ═══ */}
      {showSidebar && (
        <div className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Customer Data */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User size={16} className="text-gray-500" /> Kundendaten
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium text-gray-900">{collectedData.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PLZ</span>
                <span className="font-medium text-gray-900">{collectedData.plz || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telefon</span>
                <span className="font-medium text-gray-900">{collectedData.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">E-Mail</span>
                <span className="font-medium text-gray-900 text-xs truncate max-w-[160px]">{collectedData.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Collected Project Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Ruler size={16} className="text-gray-500" /> Projekt
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Modell</span>
                <span className="font-medium text-gray-900">{collectedData.model || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Masse</span>
                <span className="font-medium text-gray-900">{collectedData.dimensions || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Projekt</span>
                <span className="font-medium text-gray-900 text-xs truncate max-w-[160px]">{collectedData.project || '—'}</span>
              </div>
            </div>
            {session.lead_id && (
              <button
                onClick={() => navigate('/leads')}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <LayoutGrid size={14} /> Lead im Kanban oeffnen
              </button>
            )}
          </div>

          {/* Latest Offer for this lead (+ re-quote) */}
          {session.lead_id && latestOffer && (() => {
            const pricing = (latestOffer.pricing || {}) as Record<string, unknown>;
            const variants = (latestOffer.variants || []) as Array<Record<string, unknown>>;
            const isPending = pricing.status === 'pending';
            const fmtEUR = (v: number) =>
              v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

            // Price resolution: try manual/legacy pricing, then the recommended (or first) variant.
            const recommended =
              variants.find((v) => v.tier === 'recommended') || variants[0];
            const grossNum = Number(
              (pricing.sellingPriceGross as number) ??
              (recommended?.totalGrossEUR as number) ??
              NaN
            );
            const netNum = Number(
              (pricing.sellingPriceNet as number) ??
              (recommended?.totalNetEUR as number) ??
              NaN
            );
            const hasGross = Number.isFinite(grossNum) && grossNum > 0;
            const hasNet = Number.isFinite(netNum) && netNum > 0;

            const statusLabel: Record<string, string> = {
              draft: 'Entwurf',
              sent: 'Versendet',
              accepted: 'Angenommen',
              rejected: 'Abgelehnt',
              pending: 'In Bearbeitung',
            };

            return (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" /> Angebot
                  {latestOffer.status && (
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                      {statusLabel[latestOffer.status] || latestOffer.status}
                    </span>
                  )}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nummer</span>
                    <span className="font-medium text-gray-900">{latestOffer.offer_number || '—'}</span>
                  </div>
                  {hasGross && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Preis (brutto)</span>
                      <span className="font-bold text-gray-900">{fmtEUR(grossNum)} €</span>
                    </div>
                  )}
                  {!hasGross && hasNet && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Preis (netto)</span>
                      <span className="font-bold text-gray-900">{fmtEUR(netNum)} €</span>
                    </div>
                  )}
                  {variants.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Varianten</span>
                      <span className="font-medium text-gray-900">{variants.length}</span>
                    </div>
                  )}
                </div>

                {/* Pending / stuck pricing -> warning + re-quote */}
                {isPending && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" /> Preisberechnung läuft oder hängt
                    </p>
                    <p className="text-[11px] text-yellow-700 mt-1">
                      Falls die Berechnung zu lange dauert, kann sie neu gestartet werden.
                    </p>
                    <button
                      onClick={handleRequote}
                      disabled={requoting}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={requoting ? 'animate-spin' : ''} />
                      {requoting ? 'Wird gestartet...' : 'Preis neu berechnen'}
                    </button>
                  </div>
                )}

                {/* Offer link */}
                {latestOffer.public_token && (
                  <a
                    href={`${window.location.origin}/p/offer/${latestOffer.public_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText size={14} /> Angebot ansehen
                  </a>
                )}

                {/* Re-quote available even when not pending (e.g. to refresh prices) */}
                {!isPending && (
                  <button
                    onClick={handleRequote}
                    disabled={requoting}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={requoting ? 'animate-spin' : ''} />
                    {requoting ? 'Wird gestartet...' : 'Preis neu berechnen'}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Auto-Quote (from Max) or Manual Pricing */}
          {(() => {
            const quote = (session.metadata as any)?.quote;
            const fmtEUR = (v: number) => v?.toLocaleString('de-DE', { minimumFractionDigits: 0 }) || '—';
            
            if (quote?.totalBrutto) {
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Euro size={16} className="text-gray-500" /> Auto-Kalkulation
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5"><Check size={11} /> Erstellt</span>
                    <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-medium">INTERN</span>
                  </h3>
                  
                  {/* Offer number */}
                  {quote.offerNumber && (
                    <div className="text-xs text-gray-500 mb-3">Nr. {quote.offerNumber}</div>
                  )}
                  
                  {/* EK breakdown */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Produkt EK</span>
                      <span>{fmtEUR(quote.productEK)} €</span>
                    </div>
                    {quote.extrasEK > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Extras EK</span>
                        <span>{fmtEUR(quote.extrasEK)} €</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-500">
                      <span>Transport</span>
                      <span>{fmtEUR(quote.transportEK)} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-700 pt-1 border-t border-gray-200">
                      <span>Gesamt EK</span>
                      <span>{fmtEUR(quote.totalEK)} €</span>
                    </div>
                  </div>
                  
                  {/* VK breakdown */}
                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Produkt VK (40% Marge)</span>
                      <span>{fmtEUR(quote.productVK)} €</span>
                    </div>
                    {quote.extrasVK > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Extras VK</span>
                        <span>{fmtEUR(quote.extrasVK)} €</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Montage (1 Tag)</span>
                      <span>{fmtEUR(quote.installationVK)} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-200">
                      <span>VK Netto</span>
                      <span>{fmtEUR(quote.totalNetto)} €</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>+ 19% MwSt.</span>
                      <span>{fmtEUR(quote.vatAmount)} €</span>
                    </div>
                  </div>
                  
                  {/* Brutto total */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <div className="text-xs text-blue-600 font-medium">VK Brutto</div>
                    <div className="text-xl font-black text-blue-800">{fmtEUR(quote.totalBrutto)} €</div>
                  </div>
                  
                  {/* Margin */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-2 text-center">
                    <span className="text-xs text-emerald-600 font-medium">Marge: </span>
                    <span className="text-sm font-bold text-emerald-700">{fmtEUR(quote.marginAmount)} €</span>
                    <span className="text-xs text-emerald-500 ml-1">({quote.marginPercent}%)</span>
                  </div>
                  
                  {/* Offer link */}
                  {quote.offerUrl && (
                    <a
                      href={quote.offerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText size={14} /> Angebot PDF ansehen
                    </a>
                  )}
                  
                  {/* Upsell info */}
                  {quote.upsellModel && (
                    <div className="mt-2 bg-violet-50 border border-violet-200 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-violet-600 font-medium inline-flex items-center gap-1"><Sparkles size={12} /> Upsell: {quote.upsellModel}</div>
                      <div className="text-xs font-bold text-violet-800">{fmtEUR(quote.upsellTotalBrutto)} € brutto</div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notizen</label>
                    <textarea
                      value={pricingNotes}
                      onChange={(e) => setPricingNotes(e.target.value)}
                      rows={2}
                      placeholder="z.B. Sonderrabatt, Extras..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={savePricing}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {pricingSaved ? <><Check size={14} /> Gespeichert!</> : 'Notizen speichern'}
                  </button>
                </div>
              );
            }
            
            // Fallback: manual pricing
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Euro size={16} className="text-gray-500" /> Kalkulation
                  <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-medium">INTERN</span>
                </h3>
                <p className="text-xs text-gray-400 mb-3">Automatische Kalkulation wird erstellt, sobald Max genug Daten hat (Modell + Masse + Kontakt).</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Einkaufspreis (EK)</label>
                    <div className="relative">
                      <input type="text" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="z.B. 3.500" className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <span className="absolute right-3 top-2 text-gray-400 text-sm">€</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Verkaufspreis (VK)</label>
                    <div className="relative">
                      <input type="text" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="z.B. 5.900" className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <span className="absolute right-3 top-2 text-gray-400 text-sm">€</span>
                    </div>
                  </div>
                  {purchasePrice && sellingPrice && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                      <span className="text-xs text-emerald-600 font-medium">Marge: </span>
                      <span className="text-sm font-bold text-emerald-700">
                        {(parseFloat(sellingPrice.replace(/[.,]/g, '')) - parseFloat(purchasePrice.replace(/[.,]/g, ''))).toLocaleString('de-DE')} €
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notizen</label>
                    <textarea value={pricingNotes} onChange={(e) => setPricingNotes(e.target.value)} rows={2} placeholder="z.B. Sonderrabatt, Extras..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <button onClick={savePricing} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                    {pricingSaved ? <><Check size={14} /> Gespeichert!</> : 'Kalkulation speichern'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Offer Agent Trigger */}
          {session.lead_id && (
            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-4">
              <h3 className="text-sm font-bold text-violet-900 mb-2 flex items-center gap-2">
                <Bot size={16} className="text-violet-600" /> Offer Agent (3-Tier)
              </h3>
              <p className="text-xs text-violet-600 mb-3">
                Fuer eine erweiterte 3-Tier Wycena (Economy/Empfohlen/Premium) den Lead im Kanban auf "Oferta Agent" ziehen.
              </p>
              <button
                onClick={() => navigate('/leads')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-sm"
              >
                Zum Kanban <ArrowRight size={14} /> Offer Agent starten
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
