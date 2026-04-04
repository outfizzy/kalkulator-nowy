import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════
// AI Ads Manager — Google Ads management for zadaszto.pl
// ═══════════════════════════════════════════════════════════════

type Tab = 'dashboard' | 'campaigns' | 'chat' | 'proposals' | 'settings';

interface BusinessConfig {
  id: string;
  company_name: string;
  monthly_budget_pln: number;
  max_cpl_pln: number;
  target_roas: number;
  regions: string[];
  top_products: { name: string; priority: number; margin?: string }[];
  autonomy_level: string;
  emergency_stop: boolean;
  updated_at: string;
}

interface Campaign {
  id: string;
  google_campaign_id: string;
  name: string;
  type: string;
  status: string;
  daily_budget_pln: number;
  bidding_strategy: string;
  target_cpa_pln: number;
}

interface DailyMetric {
  date: string;
  impressions: number;
  clicks: number;
  cost_pln: number;
  conversions: number;
  conv_value_pln: number;
  ctr: number;
  avg_cpc: number;
  roas: number;
}

interface Alert {
  id: string;
  severity: string;
  type: string;
  message: string;
  action_required: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

interface Proposal {
  id: string;
  type: string;
  title: string;
  description: string;
  reasoning_full: string;
  expected_impact: { metric: string; delta_pct: number; confidence: string };
  risk_level: string;
  status: string;
  created_at: string;
  campaign?: Campaign;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  attachments?: any;
}

export default function AdsManagerPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState<Partial<BusinessConfig>>({});

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ═══ DATA LOADING ═══
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, campaignsRes, metricsRes, alertsRes, proposalsRes] = await Promise.all([
        supabase.from('ads_business_config').select('*').limit(1).single(),
        supabase.from('ads_campaigns').select('*').order('name'),
        supabase.from('ads_daily_metrics').select('*').order('date', { ascending: false }).limit(90),
        supabase.from('ads_alerts').select('*').is('acknowledged_at', null).order('created_at', { ascending: false }).limit(10),
        supabase.from('ads_proposals').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      if (configRes.data) setConfig(configRes.data);
      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      if (proposalsRes.data) setProposals(proposalsRes.data);
    } catch (err) {
      console.error('Failed to load ads data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ═══ COMPUTED METRICS ═══
  const last7d = metrics.filter(m => {
    const d = new Date(m.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) <= 7 * 86400000;
  });
  const last30d = metrics.filter(m => {
    const d = new Date(m.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) <= 30 * 86400000;
  });

  const sum = (arr: DailyMetric[], key: keyof DailyMetric) => arr.reduce((s, m) => s + (Number(m[key]) || 0), 0);
  const totalCost30d = sum(last30d, 'cost_pln');
  const totalClicks30d = sum(last30d, 'clicks');
  const totalImpressions30d = sum(last30d, 'impressions');
  const totalConversions30d = sum(last30d, 'conversions');
  const totalConvValue30d = sum(last30d, 'conv_value_pln');
  const avgCPC30d = totalClicks30d > 0 ? totalCost30d / totalClicks30d : 0;
  const avgCTR30d = totalImpressions30d > 0 ? (totalClicks30d / totalImpressions30d) * 100 : 0;
  const cpl30d = totalConversions30d > 0 ? totalCost30d / totalConversions30d : 0;
  const roas30d = totalCost30d > 0 ? totalConvValue30d / totalCost30d : 0;

  const pendingProposals = proposals.filter(p => p.status === 'pending_approval');

  // ═══ CONFIG SAVE ═══
  const saveConfig = async () => {
    if (!config) return;
    const { error } = await supabase.from('ads_business_config').update({
      ...configDraft,
      updated_at: new Date().toISOString()
    }).eq('id', config.id);
    if (!error) {
      setConfig({ ...config, ...configDraft } as BusinessConfig);
      setEditingConfig(false);
    }
  };

  // ═══ CHAT ═══
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput.trim(),
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Save user message
      await supabase.from('ads_chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMsg.content
      });

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke('ads-chat', {
        body: {
          message: userMsg.content,
          session_id: sessionId,
          config,
          metrics_summary: {
            cost_30d: totalCost30d,
            clicks_30d: totalClicks30d,
            conversions_30d: totalConversions30d,
            cpl_30d: cpl30d,
            roas_30d: roas30d,
            campaigns_count: campaigns.length
          }
        }
      });

      if (error) throw error;

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.response || 'Przepraszam, nie udało się przetworzyć zapytania.',
        created_at: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, aiMsg]);

      // Save AI message
      await supabase.from('ads_chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiMsg.content
      });
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Błąd połączenia z AI. Edge function `ads-chat` nie jest jeszcze wdrożona. Zostanie aktywowana w Sprint 2.',
        created_at: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ═══ PROPOSAL ACTIONS ═══
  const updateProposal = async (id: string, status: string) => {
    await supabase.from('ads_proposals').update({
      status,
      reviewed_at: new Date().toISOString()
    }).eq('id', id);
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  // ═══ RENDER ═══
  const tabs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'campaigns', label: 'Kampanie', icon: '🎯' },
    { key: 'chat', label: 'Chat AI', icon: '💬' },
    { key: 'proposals', label: 'Propozycje', icon: '📥', badge: pendingProposals.length },
    { key: 'settings', label: 'Ustawienia', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Ładowanie AI Ads Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center text-xl">🤖</div>
              <div>
                <h1 className="text-2xl font-bold">AI Ads Manager</h1>
                <p className="text-blue-200 text-sm">zadaszto.pl — Google Ads</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {config?.emergency_stop && (
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-medium animate-pulse">🚨 EMERGENCY STOP</span>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              config?.autonomy_level === 'full_auto' ? 'bg-green-500/20 text-green-300' :
              config?.autonomy_level === 'semi_auto' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-slate-500/20 text-slate-300'
            }`}>
              {config?.autonomy_level === 'full_auto' ? '🟢 Auto-pilot' :
               config?.autonomy_level === 'semi_auto' ? '🟡 Semi-Auto' : '⚪ Manual'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge ? (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard label="Wydatki 30d" value={`${totalCost30d.toFixed(0)} zł`} icon="💰"
              subtitle={`Budżet: ${config?.monthly_budget_pln || '-'} zł`}
              color={totalCost30d > (config?.monthly_budget_pln || 99999) ? 'red' : 'blue'} />
            <KPICard label="Konwersje 30d" value={totalConversions30d.toFixed(0)} icon="🎯"
              subtitle={`${(totalConversions30d / 30).toFixed(1)} / dzień`} color="green" />
            <KPICard label="CPL" value={`${cpl30d.toFixed(0)} zł`} icon="📉"
              subtitle={`Target: ${config?.max_cpl_pln || '-'} zł`}
              color={cpl30d > (config?.max_cpl_pln || 999) ? 'red' : 'green'} />
            <KPICard label="ROAS" value={`${roas30d.toFixed(1)}x`} icon="📈"
              subtitle={`Target: ${config?.target_roas || '-'}x`}
              color={roas30d >= (config?.target_roas || 0) ? 'green' : 'yellow'} />
            <KPICard label="CTR" value={`${avgCTR30d.toFixed(2)}%`} icon="👆"
              subtitle={`CPC: ${avgCPC30d.toFixed(2)} zł`} color="purple" />
          </div>

          {/* Chart placeholder */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">📊 Trendy (30 dni)</h3>
            {last30d.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">📡</p>
                <p className="text-lg font-medium">Brak danych — uruchom synchronizację</p>
                <p className="text-sm mt-1">Edge Function <code className="bg-slate-100 px-2 py-0.5 rounded">ads-sync</code> pobierze dane z Google Ads</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 h-40">
                {last30d.slice(0, 30).reverse().map((m, i) => {
                  const maxCost = Math.max(...last30d.map(x => Number(x.cost_pln) || 0), 1);
                  const h = ((Number(m.cost_pln) || 0) / maxCost) * 100;
                  return (
                    <div key={i} className="flex flex-col justify-end items-center group relative">
                      <div className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                        {m.date}: {Number(m.cost_pln).toFixed(0)} zł, {m.clicks} klik.
                      </div>
                      <div className="w-full bg-blue-500/80 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                        style={{ height: `${Math.max(h, 2)}%` }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">🔔 Alerty</h3>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                    a.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                    a.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <span className="text-lg">{a.severity === 'critical' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{a.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleString('pl-PL')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => setTab('chat')}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-left group">
              <span className="text-2xl">💬</span>
              <p className="text-sm font-semibold text-slate-700 mt-2 group-hover:text-blue-600">Porozmawiaj z AI</p>
              <p className="text-xs text-slate-400 mt-1">Zapytaj o wydajność kampanii, strategię, rekomendacje</p>
            </button>
            <button onClick={() => setTab('proposals')}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-left group">
              <span className="text-2xl">📥</span>
              <p className="text-sm font-semibold text-slate-700 mt-2 group-hover:text-blue-600">
                Propozycje AI {pendingProposals.length > 0 && <span className="text-red-500">({pendingProposals.length})</span>}
              </p>
              <p className="text-xs text-slate-400 mt-1">Zatwierdź lub odrzuć proponowane optymalizacje</p>
            </button>
            <button onClick={() => setTab('settings')}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-left group">
              <span className="text-2xl">⚙️</span>
              <p className="text-sm font-semibold text-slate-700 mt-2 group-hover:text-blue-600">Konfiguracja</p>
              <p className="text-xs text-slate-400 mt-1">Budżet, regiony, produkty, poziom autonomii</p>
            </button>
          </div>
        </div>
      )}

      {/* ═══ CAMPAIGNS ═══ */}
      {tab === 'campaigns' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">🎯 Kampanie Google Ads</h3>
            <p className="text-sm text-slate-400 mt-1">Dane synchronizowane z Google Ads API</p>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-5xl mb-4">📡</p>
              <p className="text-lg font-medium">Brak kampanii</p>
              <p className="text-sm mt-2">Uruchom <code className="bg-slate-100 px-2 py-0.5 rounded">ads-sync</code> aby pobrać kampanie z Google Ads</p>
              <p className="text-xs text-slate-300 mt-4">Customer ID: {config?.allowed_customer_ids?.[0] || '?'} | MCC: 546-765-6892</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3">Kampania</th>
                  <th className="px-6 py-3">Typ</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Budżet/dzień</th>
                  <th className="px-6 py-3">Strategia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">ID: {c.google_campaign_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{c.type || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        c.status === 'ENABLED' ? 'bg-green-100 text-green-700' :
                        c.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.daily_budget_pln ? `${c.daily_budget_pln} zł` : '-'}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{c.bidding_strategy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ CHAT ═══ */}
      {tab === 'chat' && (
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col" style={{ height: '600px' }}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">💬 AI Ads Manager</h3>
              <p className="text-xs text-slate-400">Pytaj o kampanie, strategie, wydajność</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Claude Sonnet 4.5</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <p className="text-4xl mb-3">🤖</p>
                <p className="text-lg font-medium">Witaj w AI Ads Manager</p>
                <p className="text-sm mt-2">Jestem Twoim asystentem do zarządzania kampaniami Google Ads.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 max-w-md mx-auto">
                  {['Jak wypadła kampania wczoraj?', 'Jakie frazy generują najlepsze leady?', 'Zaproponuj optymalizacje budżetu', 'Pokaż trend wydatków z ostatniego tygodnia'].map(q => (
                    <button key={q} onClick={() => { setChatInput(q); }}
                      className="text-left text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Napisz wiadomość..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Wyślij →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROPOSALS ═══ */}
      {tab === 'proposals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">📥 Propozycje AI</h3>
            <span className="text-sm text-slate-400">{proposals.length} total, {pendingProposals.length} oczekuje</span>
          </div>

          {proposals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              <p className="text-5xl mb-4">🧠</p>
              <p className="text-lg font-medium">Brak propozycji</p>
              <p className="text-sm mt-2">AI wygeneruje propozycje optymalizacji po analizie danych kampanii</p>
            </div>
          ) : (
            proposals.map(p => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                        p.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{p.risk_level === 'low' ? '🟢 LOW' : p.risk_level === 'medium' ? '🟡 MEDIUM' : '🔴 HIGH'}</span>
                      <span className="text-xs text-slate-400">{p.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'pending_approval' ? 'bg-blue-100 text-blue-700' :
                        p.status === 'approved' ? 'bg-green-100 text-green-700' :
                        p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        p.status === 'executed' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{p.status}</span>
                    </div>
                    <h4 className="font-semibold text-slate-800">{p.title}</h4>
                    {p.description && <p className="text-sm text-slate-500 mt-1">{p.description}</p>}
                    {p.reasoning_full && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Pokaż uzasadnienie AI</summary>
                        <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-3 rounded-lg">{p.reasoning_full}</p>
                      </details>
                    )}
                  </div>
                  {p.status === 'pending_approval' && (
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => updateProposal(p.id, 'approved')}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">✅ Zatwierdź</button>
                      <button onClick={() => updateProposal(p.id, 'rejected')}
                        className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors">❌ Odrzuć</button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-3">{new Date(p.created_at).toLocaleString('pl-PL')}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ SETTINGS ═══ */}
      {tab === 'settings' && config && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">⚙️ Konfiguracja biznesowa</h3>
            {!editingConfig ? (
              <button onClick={() => { setEditingConfig(true); setConfigDraft(config); }}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">✏️ Edytuj</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={saveConfig}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">💾 Zapisz</button>
                <button onClick={() => setEditingConfig(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors">Anuluj</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConfigField label="Firma" value={config.company_name} editing={editingConfig}
              onChange={v => setConfigDraft(d => ({ ...d, company_name: v }))} draft={configDraft.company_name} />
            <ConfigField label="Budżet miesięczny (PLN)" value={String(config.monthly_budget_pln)} editing={editingConfig} type="number"
              onChange={v => setConfigDraft(d => ({ ...d, monthly_budget_pln: Number(v) }))} draft={String(configDraft.monthly_budget_pln || '')} />
            <ConfigField label="Max CPL (PLN)" value={String(config.max_cpl_pln)} editing={editingConfig} type="number"
              onChange={v => setConfigDraft(d => ({ ...d, max_cpl_pln: Number(v) }))} draft={String(configDraft.max_cpl_pln || '')} />
            <ConfigField label="Target ROAS" value={String(config.target_roas)} editing={editingConfig} type="number"
              onChange={v => setConfigDraft(d => ({ ...d, target_roas: Number(v) }))} draft={String(configDraft.target_roas || '')} />

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Regiony</label>
              <div className="flex flex-wrap gap-2">
                {config.regions?.map(r => (
                  <span key={r} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">{r}</span>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Top Produkty</label>
              <div className="space-y-2">
                {config.top_products?.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <span className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{p.priority}</span>
                    <span className="text-sm text-slate-700 font-medium">{p.name}</span>
                    {p.margin && <span className="text-xs text-slate-400">margin: {p.margin}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Poziom autonomii</label>
              {editingConfig ? (
                <select value={configDraft.autonomy_level || config.autonomy_level}
                  onChange={e => setConfigDraft(d => ({ ...d, autonomy_level: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="manual">⚪ Manual — wszystko wymaga zgody</option>
                  <option value="semi_auto">🟡 Semi-Auto — niski risk auto, reszta wymaga zgody</option>
                  <option value="full_auto">🟢 Full Auto — AI działa autonomicznie</option>
                </select>
              ) : (
                <p className="text-sm text-slate-700">{config.autonomy_level}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Emergency Stop</label>
              <button
                onClick={async () => {
                  const newValue = !config.emergency_stop;
                  await supabase.from('ads_business_config').update({ emergency_stop: newValue }).eq('id', config.id);
                  setConfig({ ...config, emergency_stop: newValue });
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  config.emergency_stop
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {config.emergency_stop ? '🚨 STOP AKTYWNY — kliknij aby wyłączyć' : '⏸️ Aktywuj Emergency Stop'}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Customer ID: {config.allowed_customer_ids?.[0]} |
              Ostatnia aktualizacja: {new Date(config.updated_at).toLocaleString('pl-PL')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ COMPONENTS ═══

function KPICard({ label, value, icon, subtitle, color }: {
  label: string; value: string; icon: string; subtitle?: string; color: string;
}) {
  const colors = {
    blue: 'from-blue-50 to-blue-100/50 border-blue-200',
    green: 'from-green-50 to-green-100/50 border-green-200',
    red: 'from-red-50 to-red-100/50 border-red-200',
    yellow: 'from-yellow-50 to-yellow-100/50 border-yellow-200',
    purple: 'from-purple-50 to-purple-100/50 border-purple-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color as keyof typeof colors] || colors.blue} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function ConfigField({ label, value, editing, onChange, draft, type = 'text' }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; draft?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      {editing ? (
        <input type={type} value={draft ?? value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      ) : (
        <p className="text-sm text-slate-700 font-medium">{value}</p>
      )}
    </div>
  );
}
