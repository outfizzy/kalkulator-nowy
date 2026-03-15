import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════
// MESSENGER PANEL — Admin view for Messenger Bot conversations
// ═══════════════════════════════════════════════════

interface Conversation {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_profile_pic: string | null;
  lead_id: string | null;
  lead_data: Record<string, any>;
  status: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  direction: string;
  message: string;
  ai_response: string | null;
  lead_data: Record<string, any> | null;
  created_at: string;
}

export default function FacebookMessengerPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'handed_off' | 'closed'>('all');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messenger_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err: any) {
      toast.error('Błąd ładowania konwersacji: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conv: Conversation) => {
    setSelectedConv(conv);
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messenger_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      toast.error('Błąd ładowania wiadomości: ' + err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const updateConvStatus = async (convId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('messenger_conversations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', convId);

      if (error) throw error;
      toast.success(`Status zmieniony na: ${newStatus}`);
      loadConversations();
      if (selectedConv?.id === convId) {
        setSelectedConv(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      toast.error('Błąd: ' + err.message);
    }
  };

  const filteredConversations = conversations.filter(c =>
    filter === 'all' ? true : c.status === filter
  );

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Aktywna', color: 'text-green-700', bg: 'bg-green-100' },
    handed_off: { label: 'Przekazana', color: 'text-amber-700', bg: 'bg-amber-100' },
    closed: { label: 'Zamknięta', color: 'text-slate-500', bg: 'bg-slate-100' },
  };

  const productLabels: Record<string, string> = {
    terrassendach: '🏠 Terrassenüberdachung',
    pergola: '🌿 Pergola',
    carport: '🚗 Carport',
    wintergarten: '🪟 Wintergarten',
    vordach: '🚪 Vordach',
    zaun: '🏗️ Zaun / Sichtschutz',
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'eben';
    if (diffMin < 60) return `vor ${diffMin}m`;
    if (diffH < 24) return `vor ${diffH}h`;
    if (diffD < 7) return `vor ${diffD}d`;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-xl">💬</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Messenger Bot</h2>
            <p className="text-xs text-slate-500">
              {conversations.length} Konwersacji • {conversations.filter(c => c.status === 'active').length} aktywnych
            </p>
          </div>
        </div>
        <button
          onClick={loadConversations}
          className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          🔄 Odśwież
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {[
          { key: 'all' as const, label: 'Wszystkie', icon: '📋', count: conversations.length },
          { key: 'active' as const, label: 'Aktywne', icon: '🟢', count: conversations.filter(c => c.status === 'active').length },
          { key: 'handed_off' as const, label: 'Przekazane', icon: '🟡', count: conversations.filter(c => c.status === 'handed_off').length },
          { key: 'closed' as const, label: 'Zamknięte', icon: '⚫', count: conversations.filter(c => c.status === 'closed').length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              filter === f.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
            {f.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === f.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '500px' }}>
        {/* Left — Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Konwersacje ({filteredConversations.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 mt-3">Ładuję...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                  <span className="text-4xl">💬</span>
                  <p className="text-sm text-slate-500 mt-3 font-medium">Brak konwersacji</p>
                </div>

                {/* Setup Guide */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200 space-y-3">
                  <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">⚙️</span>
                    Setup Messenger Bot
                  </p>

                  <div className="space-y-2">
                    {[
                      { step: '1', label: 'Otwórz', link: 'https://developers.facebook.com/apps/', text: 'Facebook Developer Console' },
                      { step: '2', label: 'Przejdź do Messenger → Webhook', text: '' },
                      { step: '3', label: 'Wklej Webhook URL ⬇️', text: '' },
                      { step: '4', label: 'Verify Token:', text: 'polendach24_messenger_verify' },
                      { step: '5', label: 'Subskrybuj:', text: 'messages, messaging_postbacks' },
                    ].map(s => (
                      <div key={s.step} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{s.step}</span>
                        <p className="text-[11px] text-slate-700">
                          {s.label}{' '}
                          {s.link ? (
                            <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">{s.text}</a>
                          ) : (
                            <span className="font-semibold text-indigo-700">{s.text}</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Webhook URL */}
                  <div className="bg-white rounded-lg p-2.5 border border-indigo-100">
                    <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider mb-1">Webhook URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] text-slate-700 bg-slate-100 px-2 py-1 rounded font-mono flex-1 break-all select-all">
                        https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/messenger-webhook
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/messenger-webhook');
                          toast.success('📋 Skopiowano!');
                        }}
                        className="px-2 py-1 bg-indigo-600 text-white text-[10px] rounded font-bold hover:bg-indigo-700"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Test button */}
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('https://whgjsppyuvglhbdgdark.supabase.co/functions/v1/messenger-webhook?hub.mode=subscribe&hub.verify_token=polendach24_messenger_verify&hub.challenge=test_ok');
                        const text = await res.text();
                        if (text === 'test_ok') {
                          toast.success('✅ Webhook działa poprawnie!');
                        } else {
                          toast.error('⚠️ Webhook odpowiedział: ' + text);
                        }
                      } catch (err: any) {
                        toast.error('❌ Webhook error: ' + err.message);
                      }
                    }}
                    className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    🔗 Test połączenia z Webhook
                  </button>

                  <p className="text-[9px] text-indigo-400 text-center">
                    Po konfiguracji, nowe wiadomości z Messengera pojawią się tutaj automatycznie
                  </p>
                </div>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const status = statusConfig[conv.status] || statusConfig.active;
                return (
                  <button
                    key={conv.id}
                    onClick={() => loadMessages(conv)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                      selectedConv?.id === conv.id ? 'bg-indigo-50 border-l-3 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {conv.sender_profile_pic ? (
                        <img src={conv.sender_profile_pic} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">
                            {(conv.sender_name || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {conv.sender_name || 'Unbekannt'}
                          </p>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {conv.message_count} Nachr.
                          </span>
                          {conv.lead_data?.product && (
                            <span className="text-[10px] text-indigo-500 font-medium truncate">
                              {conv.lead_data.product}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right — Chat View */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                  <span className="text-4xl">💬</span>
                </div>
                <p className="text-slate-500 font-medium">Wybierz konwersację</p>
                <p className="text-xs text-slate-400 mt-1">Kliknij na konwersację z listy aby zobaczyć rozmowę</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedConv.sender_profile_pic ? (
                      <img src={selectedConv.sender_profile_pic} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {(selectedConv.sender_name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800">{selectedConv.sender_name || 'Unbekannt'}</p>
                      <p className="text-[10px] text-slate-400">
                        Messenger • {selectedConv.message_count} Nachrichten • seit {new Date(selectedConv.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConv.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateConvStatus(selectedConv.id, 'handed_off')}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors"
                        >
                          👤 Przekaż
                        </button>
                        <button
                          onClick={() => updateConvStatus(selectedConv.id, 'closed')}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                        >
                          ✅ Zamknij
                        </button>
                      </>
                    )}
                    {selectedConv.status !== 'active' && (
                      <button
                        onClick={() => updateConvStatus(selectedConv.id, 'active')}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                      >
                        🔄 Reaktywuj
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-white to-slate-50" style={{ maxHeight: '400px' }}>
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-400">Brak wiadomości</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <React.Fragment key={msg.id}>
                      {/* User message */}
                      <div className="flex justify-start">
                        <div className="max-w-[75%]">
                          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm">
                            <p className="text-sm text-slate-800">{msg.message}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 ml-2">
                            {msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* AI response */}
                      {msg.ai_response && (
                        <div className="flex justify-end">
                          <div className="max-w-[75%]">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl rounded-tr-md px-4 py-2.5 shadow-md">
                              <p className="text-sm text-white">{msg.ai_response}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 mr-2 text-right">
                              🤖 AI Bot • {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Lead Data Card */}
              {selectedConv.lead_data && Object.keys(selectedConv.lead_data).length > 0 && (
                <div className="border-t border-slate-200 p-4 bg-gradient-to-r from-emerald-50 to-cyan-50">
                  <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center text-[10px]">📊</span>
                    Zebrane dane (Lead-Qualifizierung)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedConv.lead_data.product && (
                      <DataChip 
                        label="Produkt" 
                        value={productLabels[selectedConv.lead_data.product] || selectedConv.lead_data.product} 
                        color="indigo" 
                      />
                    )}
                    {selectedConv.lead_data.plz && (
                      <DataChip label="PLZ" value={selectedConv.lead_data.plz} color="blue" />
                    )}
                    {selectedConv.lead_data.phone && (
                      <DataChip label="Telefon" value={selectedConv.lead_data.phone} color="green" />
                    )}
                    {selectedConv.lead_data.email && (
                      <DataChip label="E-Mail" value={selectedConv.lead_data.email} color="violet" />
                    )}
                    {selectedConv.lead_data.name && (
                      <DataChip label="Name" value={selectedConv.lead_data.name} color="amber" />
                    )}
                    {selectedConv.lead_data.width && selectedConv.lead_data.depth && (
                      <DataChip label="Maße" value={`${selectedConv.lead_data.width} × ${selectedConv.lead_data.depth}m`} color="rose" />
                    )}
                  </div>
                  {selectedConv.lead_id && (
                    <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
                      ✅ Powiązano z leadem CRM
                    </p>
                  )}
                </div>
              )}

              {/* Bot info footer */}
              <div className="border-t border-slate-200 px-4 py-2.5 bg-slate-50">
                <p className="text-[10px] text-slate-400 text-center">
                  🤖 Odpowiedzi generowane przez AI (Claude) • Rozmowy automatycznie tworzą leady w CRM
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Wszystkie rozmowy', value: conversations.length, icon: '💬', gradient: 'from-indigo-500 to-purple-600' },
          { label: 'Aktywne', value: conversations.filter(c => c.status === 'active').length, icon: '🟢', gradient: 'from-green-500 to-emerald-600' },
          { label: 'Z produktem', value: conversations.filter(c => c.lead_data?.product).length, icon: '🏠', gradient: 'from-amber-500 to-orange-600' },
          { label: 'Z danymi kontakt.', value: conversations.filter(c => c.lead_data?.phone || c.lead_data?.email).length, icon: '📞', gradient: 'from-rose-500 to-pink-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-2`}>
              <span className="text-base">{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Data Chip component ───
function DataChip({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className={`px-3 py-2 rounded-lg border ${colors[color] || colors.indigo}`}>
      <p className="text-[9px] uppercase tracking-wider opacity-70 font-bold">{label}</p>
      <p className="text-xs font-semibold mt-0.5 truncate">{value}</p>
    </div>
  );
}
