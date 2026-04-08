import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════
// AI Ads Manager — Google Ads management for zadaszto.pl
// ═══════════════════════════════════════════════════════════════

type Tab = 'dashboard' | 'campaigns' | 'leads_pl' | 'analytics' | 'chat' | 'proposals' | 'experiments' | 'knowledge' | 'settings';

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

interface PolishLead {
  id: string;
  status: string;
  source: string;
  customer_data: any;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
}

interface PolishLeadStats {
  total: number;
  last7d: number;
  last30d: number;
  today: number;
  byStatus: Record<string, number>;
  dailyCounts: { date: string; count: number }[];
  recentLeads: PolishLead[];
}

interface GA4Metric {
  date: string;
  sessions: number;
  users: number;
  new_users: number;
  bounce_rate: number;
  avg_session_duration: number;
  page_views: number;
  conversions: number;
  source: string;
  medium: string;
}

interface GSCMetric {
  date: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Experiment {
  id: string;
  campaign_id: string | null;
  hypothesis: string;
  variant_a: any;
  variant_b: any;
  start_date: string | null;
  end_date: string | null;
  winner: string | null;
  confidence_pct: number | null;
  learnings: string | null;
  status: string;
}

interface KnowledgeEntry {
  id: string;
  source_type: string;
  source_url: string;
  title: string;
  summary: string;
  tags: string[];
  relevance_score: number;
  learned_at: string;
}

export default function AdsManagerPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [polishLeads, setPolishLeads] = useState<PolishLeadStats>({ total: 0, last7d: 0, last30d: 0, today: 0, byStatus: {}, dailyCounts: [], recentLeads: [] });
  const [ga4Metrics, setGa4Metrics] = useState<GA4Metric[]>([]);
  const [gscMetrics, setGscMetrics] = useState<GSCMetric[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState<Partial<BusinessConfig>>({});

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const autoSyncTriggered = useRef(false);
  const [ga4Syncing, setGa4Syncing] = useState(false);
  const [gscSyncing, setGscSyncing] = useState(false);
  const [newExpOpen, setNewExpOpen] = useState(false);
  const [newKbOpen, setNewKbOpen] = useState(false);

  // ═══ DATA LOADING ═══
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, campaignsRes, metricsRes, alertsRes, proposalsRes, accountRes, plLeadsRes, ga4Res, gscRes, expRes, kbRes] = await Promise.all([
        supabase.from('ads_business_config').select('*').limit(1).single(),
        supabase.from('ads_campaigns').select('*').order('name'),
        supabase.from('ads_daily_metrics').select('*').order('date', { ascending: false }).limit(90),
        supabase.from('ads_alerts').select('*').is('acknowledged_at', null).order('created_at', { ascending: false }).limit(10),
        supabase.from('ads_proposals').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('ads_accounts').select('last_sync_at').limit(1).single(),
        supabase.from('leads').select('id, status, source, customer_data, created_at, updated_at, assigned_to')
          .eq('source', 'website_pl').order('created_at', { ascending: false }).limit(500),
        supabase.from('ads_ga4_metrics').select('*').order('date', { ascending: false }).limit(200),
        supabase.from('ads_search_console_metrics').select('*').order('clicks', { ascending: false }).limit(100),
        supabase.from('ads_experiments').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('ads_knowledge_base').select('*').order('learned_at', { ascending: false }).limit(50),
      ]);

      if (configRes.data) setConfig(configRes.data);
      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      if (proposalsRes.data) setProposals(proposalsRes.data);
      if (accountRes.data?.last_sync_at) setLastSyncAt(accountRes.data.last_sync_at);
      if (ga4Res.data) setGa4Metrics(ga4Res.data);
      if (gscRes.data) setGscMetrics(gscRes.data);
      if (expRes.data) setExperiments(expRes.data);
      if (kbRes.data) setKnowledgeBase(kbRes.data);

      // Compute Polish lead stats inline
      const plLeads: PolishLead[] = plLeadsRes.data || [];
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const plStats: PolishLeadStats = {
        total: plLeads.length, today: 0, last7d: 0, last30d: 0,
        byStatus: {}, dailyCounts: [], recentLeads: plLeads.slice(0, 20),
      };
      const dailyMap: Record<string, number> = {};
      for (const lead of plLeads) {
        const d = new Date(lead.created_at);
        const dayStr = d.toISOString().slice(0, 10);
        const diffDays = (now.getTime() - d.getTime()) / 86400000;
        if (dayStr === todayStr) plStats.today++;
        if (diffDays <= 7) plStats.last7d++;
        if (diffDays <= 30) plStats.last30d++;
        const s = lead.status || 'new';
        plStats.byStatus[s] = (plStats.byStatus[s] || 0) + 1;
        if (diffDays <= 30) dailyMap[dayStr] = (dailyMap[dayStr] || 0) + 1;
      }
      plStats.dailyCounts = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setPolishLeads(plStats);

      return campaignsRes.data?.length || 0;
    } catch (err) {
      console.error('Failed to load ads data:', err);
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  // ═══ SYNC (200-OK Payload pattern) ═══
  const triggerSync = useCallback(async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    if (!silent) setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ads-sync', {
        body: {}
      });

      // Handle network-level errors (e.g. function not deployed)
      if (error) {
        const msg = error?.message || 'Network error';
        if (!silent) setSyncResult(`❌ ${msg}`);
        console.error('[ads-sync] invoke error:', msg);
        return;
      }

      // Handle 200-OK Payload: check data.success
      if (data && !data.success) {
        const errMsg = data.error || 'Nieznany błąd';
        if (!silent) setSyncResult(`❌ ${errMsg}${data.details ? ` — ${data.details}` : ''}`);
        console.error('[ads-sync] API error:', errMsg, data.details);
        return;
      }

      // Success
      if (!silent) {
        setSyncResult(`✅ Zsynchronizowano: ${data?.campaigns || 0} kampanii, ${data?.metrics || 0} metryk`);
      }
      setLastSyncAt(data?.synced_at || new Date().toISOString());
      await loadData();
    } catch (err: any) {
      if (!silent) setSyncResult(`❌ Błąd: ${err?.message || 'Unknown error'}`);
      console.error('[ads-sync] Unexpected error:', err);
    } finally {
      setSyncing(false);
    }
  }, [syncing, loadData]);

  // ═══ INITIAL LOAD + AUTO-SYNC ═══
  useEffect(() => {
    loadData().then((campaignCount) => {
      // Auto-sync if no campaigns exist yet (first visit)
      if (campaignCount === 0 && !autoSyncTriggered.current) {
        autoSyncTriggered.current = true;
        console.log('[ads-manager] No campaigns found, triggering auto-sync...');
        triggerSync(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ PERIODIC AUTO-REFRESH (every 15 min) ═══
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[ads-manager] Periodic auto-refresh...');
      triggerSync(true); // silent — don't show UI messages
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [triggerSync]);

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

  // Real CPL: ads cost / actual Polish leads
  const realCPL = polishLeads.last30d > 0 ? totalCost30d / polishLeads.last30d : 0;

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

      // Call AI edge function (200-OK Payload)
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
          },
          polish_leads_summary: {
            today: polishLeads.today,
            last7d: polishLeads.last7d,
            last30d: polishLeads.last30d,
            total: polishLeads.total,
            real_cpl: realCPL
          }
        }
      });

      let responseText = 'Przepraszam, nie udało się przetworzyć zapytania.';
      if (error) {
        responseText = `⚠️ Błąd połączenia: ${error.message || 'Network error'}. Sprawdź czy Edge Function ads-chat jest wdrożona.`;
      } else if (data && !data.success) {
        responseText = `⚠️ ${data.error || 'Nieznany błąd AI'}`;
      } else if (data?.response) {
        responseText = data.response;
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        created_at: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, aiMsg]);

      // Save AI message
      await supabase.from('ads_chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiMsg.content
      });
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ Błąd: ${err?.message || 'Nieznany błąd'}`,
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
  // ═══ GA4 COMPUTED ═══
  const ga4BySource: Record<string, { sessions: number; conversions: number }> = {};
  for (const m of ga4Metrics) {
    const key = `${m.source}/${m.medium}`;
    if (!ga4BySource[key]) ga4BySource[key] = { sessions: 0, conversions: 0 };
    ga4BySource[key].sessions += m.sessions;
    ga4BySource[key].conversions += m.conversions;
  }
  const ga4Total = ga4Metrics.reduce((s, m) => ({ sessions: s.sessions + m.sessions, users: s.users + m.users, pageViews: s.pageViews + m.page_views, conversions: s.conversions + m.conversions }), { sessions: 0, users: 0, pageViews: 0, conversions: 0 });
  const ga4AvgBounce = ga4Metrics.length > 0 ? ga4Metrics.reduce((s, m) => s + m.bounce_rate, 0) / ga4Metrics.length : 0;

  // ═══ GA4/GSC Sync triggers ═══
  const triggerGA4Sync = async () => {
    setGa4Syncing(true);
    try {
      const { data } = await supabase.functions.invoke('ads-ga4-sync', { body: {} });
      if (data?.success) await loadData();
    } finally { setGa4Syncing(false); }
  };
  const triggerGSCSync = async () => {
    setGscSyncing(true);
    try {
      const { data } = await supabase.functions.invoke('ads-gsc-sync', { body: {} });
      if (data?.success) await loadData();
    } finally { setGscSyncing(false); }
  };

  const tabs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'campaigns', label: 'Kampanie', icon: '🎯' },
    { key: 'leads_pl', label: 'Leady PL', icon: '🇵🇱', badge: polishLeads.today || undefined },
    { key: 'analytics', label: 'Analytics', icon: '📈' },
    { key: 'chat', label: 'Chat AI', icon: '💬' },
    { key: 'proposals', label: 'Propozycje', icon: '📥', badge: pendingProposals.length || undefined },
    { key: 'experiments', label: 'Testy', icon: '🧪', badge: experiments.filter(e => e.status === 'running').length || undefined },
    { key: 'knowledge', label: 'Wiedza', icon: '📚' },
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
            <button onClick={() => triggerSync(false)} disabled={syncing}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
              {syncing ? '⏳ Synchronizuję...' : '🔄 Sync z Google'}
            </button>
          </div>
        </div>
        {lastSyncAt && (
          <p className="text-xs text-blue-300/60 mt-2 text-right">
            Ostatnia synchronizacja: {new Date(lastSyncAt).toLocaleString('pl-PL')}
          </p>
        )}
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
          {/* Sync result */}
          {syncResult && (
            <div className={`p-3 rounded-lg text-sm font-medium ${syncResult.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {syncResult}
            </div>
          )}
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

          {/* ═══ POLISH LEADS ANALYTICS WIDGET ═══ */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">🇵🇱 Leady z zadaszto.pl</h3>
              <button onClick={() => setTab('leads_pl')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium">Zobacz wszystkie →</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase">Dziś</p>
                <p className="text-2xl font-bold text-emerald-700">{polishLeads.today}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase">7 dni</p>
                <p className="text-2xl font-bold text-blue-700">{polishLeads.last7d}</p>
                <p className="text-xs text-slate-400">{(polishLeads.last7d / 7).toFixed(1)}/dzień</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase">30 dni</p>
                <p className="text-2xl font-bold text-indigo-700">{polishLeads.last30d}</p>
                <p className="text-xs text-slate-400">{(polishLeads.last30d / 30).toFixed(1)}/dzień</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase">Realny CPL</p>
                <p className="text-2xl font-bold text-amber-700">{realCPL > 0 ? `${realCPL.toFixed(0)} zł` : '—'}</p>
                <p className="text-xs text-slate-400">Target: {config?.max_cpl_pln || '-'} zł</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase">Łącznie</p>
                <p className="text-2xl font-bold text-purple-700">{polishLeads.total}</p>
                <p className="text-xs text-slate-400">od startu</p>
              </div>
            </div>
            {/* Status breakdown */}
            {Object.keys(polishLeads.byStatus).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status leadów</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(polishLeads.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                    const statusColors: Record<string, string> = {
                      new: 'bg-blue-100 text-blue-700',
                      contacted: 'bg-yellow-100 text-yellow-700',
                      qualified: 'bg-emerald-100 text-emerald-700',
                      offer_sent: 'bg-indigo-100 text-indigo-700',
                      negotiation: 'bg-purple-100 text-purple-700',
                      won: 'bg-green-100 text-green-700',
                      lost: 'bg-red-100 text-red-700',
                      formularz: 'bg-cyan-100 text-cyan-700',
                    };
                    const statusLabels: Record<string, string> = {
                      new: 'Nowe', contacted: 'Kontakt', qualified: 'Kwalifikowane',
                      offer_sent: 'Oferta', negotiation: 'Negocjacje', won: 'Wygrane',
                      lost: 'Utracone', formularz: 'Formularz',
                    };
                    return (
                      <span key={status} className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[status] || status}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Mini daily chart */}
            {polishLeads.dailyCounts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Leady dziennie (30 dni)</p>
                <div className="flex items-end gap-[2px] h-16">
                  {polishLeads.dailyCounts.map((d, i) => {
                    const maxCount = Math.max(...polishLeads.dailyCounts.map(x => x.count), 1);
                    const h = (d.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 group relative">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">
                          {d.date.slice(5)}: {d.count}
                        </div>
                        <div className="w-full bg-emerald-500/80 rounded-t hover:bg-emerald-600 transition-colors cursor-pointer"
                          style={{ height: `${Math.max(h, 4)}%` }} />
                      </div>
                    );
                  })}
                </div>
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

      {/* ═══ LEADS PL ═══ */}
      {tab === 'leads_pl' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🇵🇱 Leady z zadaszto.pl</h3>
                  <p className="text-sm text-slate-400 mt-1">Formularze kontaktowe z polskiego rynku</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">Łącznie: <strong className="text-slate-800">{polishLeads.total}</strong></span>
                  <span className="text-emerald-600">Dziś: <strong>{polishLeads.today}</strong></span>
                  <span className="text-blue-600">7d: <strong>{polishLeads.last7d}</strong></span>
                  <span className="text-indigo-600">30d: <strong>{polishLeads.last30d}</strong></span>
                  {realCPL > 0 && (
                    <span className={`font-medium ${realCPL <= (config?.max_cpl_pln || 999) ? 'text-green-600' : 'text-red-600'}`}>
                      CPL: {realCPL.toFixed(0)} zł
                    </span>
                  )}
                </div>
              </div>
            </div>
            {polishLeads.recentLeads.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-5xl mb-4">🇵🇱</p>
                <p className="text-lg font-medium">Brak leadów z zadaszto.pl</p>
                <p className="text-sm mt-2">Leady pojawią się gdy formularz na zadaszto.pl zacznie generować zapytania.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50">
                    <th className="px-6 py-3">Klient</th>
                    <th className="px-6 py-3">Kontakt</th>
                    <th className="px-6 py-3">Miasto</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {polishLeads.recentLeads.map(lead => {
                    const cd = lead.customer_data || {};
                    const name = `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Nieznany';
                    const statusColors: Record<string, string> = {
                      new: 'bg-blue-100 text-blue-700',
                      contacted: 'bg-yellow-100 text-yellow-700',
                      qualified: 'bg-emerald-100 text-emerald-700',
                      offer_sent: 'bg-indigo-100 text-indigo-700',
                      negotiation: 'bg-purple-100 text-purple-700',
                      won: 'bg-green-100 text-green-700',
                      lost: 'bg-red-100 text-red-700',
                      formularz: 'bg-cyan-100 text-cyan-700',
                    };
                    const statusLabels: Record<string, string> = {
                      new: 'Nowe', contacted: 'Kontakt', qualified: 'Kwalifikowane',
                      offer_sent: 'Oferta', negotiation: 'Negocjacje', won: 'Wygrane',
                      lost: 'Utracone', formularz: 'Formularz',
                    };
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{name}</p>
                          {cd.companyName && <p className="text-xs text-slate-400">{cd.companyName}</p>}
                        </td>
                        <td className="px-6 py-4">
                          {cd.email && <p className="text-sm text-slate-600">{cd.email}</p>}
                          {cd.phone && <p className="text-xs text-slate-400">{cd.phone}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600">{cd.city || '—'}</p>
                          {cd.postalCode && <p className="text-xs text-slate-400">{cd.postalCode}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                            {statusLabels[lead.status] || lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(lead.created_at).toLocaleDateString('pl-PL')}
                          <p className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.type === 'budget_change' ? 'bg-blue-100 text-blue-700' :
                        p.type === 'competitor_response' ? 'bg-red-100 text-red-700' :
                        p.type === 'campaign_pause' ? 'bg-orange-100 text-orange-700' :
                        p.type === 'landing_page' ? 'bg-yellow-100 text-yellow-700' :
                        p.type === 'ad_copy' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{p.type}</span>
                      {(p as any).source && (
                        <span className="text-xs text-slate-400 italic">⚡ {(p as any).source}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'pending_approval' ? 'bg-blue-100 text-blue-700' :
                        p.status === 'approved' ? 'bg-green-100 text-green-700' :
                        p.status === 'auto_approved' ? 'bg-cyan-100 text-cyan-700' :
                        p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        p.status === 'executed' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{p.status === 'auto_approved' ? '🤖 Auto' : p.status}</span>
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
                <p className="text-xs text-slate-300 mt-3">
                  {new Date(p.created_at).toLocaleString('pl-PL')}
                  {(p as any).impact_verdict && (
                    <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium ${
                      (p as any).impact_verdict === 'positive' ? 'bg-green-100 text-green-700' :
                      (p as any).impact_verdict === 'negative' ? 'bg-red-100 text-red-700' :
                      (p as any).impact_verdict === 'neutral' ? 'bg-slate-100 text-slate-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {(p as any).impact_verdict === 'positive' ? '📈 Pozytywny efekt' :
                       (p as any).impact_verdict === 'negative' ? '📉 Negatywny efekt' :
                       (p as any).impact_verdict === 'neutral' ? '➡️ Neutralny' :
                       (p as any).impact_verdict === 'insufficient_data' ? '❓ Za mało danych' :
                       '⏳ Pomiar w toku'}
                    </span>
                  )}
                  {(p as any).result_after_7d?.deltas && (
                    <span className="ml-2 text-slate-400">
                      Konwersje: {(p as any).result_after_7d.deltas.conversions_pct > 0 ? '+' : ''}{Number((p as any).result_after_7d.deltas.conversions_pct).toFixed(0)}% |
                      Koszt: {(p as any).result_after_7d.deltas.cost_pct > 0 ? '+' : ''}{Number((p as any).result_after_7d.deltas.cost_pct).toFixed(0)}%
                    </span>
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ ANALYTICS ═══ */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">📈 Analytics — GA4 + Search Console</h3>
            <div className="flex gap-2">
              <button onClick={triggerGA4Sync} disabled={ga4Syncing}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors">
                {ga4Syncing ? '⏳...' : '🔄 Sync GA4'}
              </button>
              <button onClick={triggerGSCSync} disabled={gscSyncing}
                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors">
                {gscSyncing ? '⏳...' : '🔄 Sync GSC'}
              </button>
            </div>
          </div>

          {/* GA4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard label="Sesje (30d)" value={ga4Total.sessions.toLocaleString()} icon="👥" subtitle={`${(ga4Total.sessions / 30).toFixed(0)}/dzień`} color="blue" />
            <KPICard label="Użytkownicy" value={ga4Total.users.toLocaleString()} icon="🧑" subtitle={`nowi: ${ga4Metrics.reduce((s, m) => s + m.new_users, 0)}`} color="green" />
            <KPICard label="Bounce Rate" value={`${(ga4AvgBounce * 100).toFixed(1)}%`} icon="↩️" subtitle="średnia 30d" color={ga4AvgBounce > 0.6 ? 'red' : 'green'} />
            <KPICard label="Odsłony" value={ga4Total.pageViews.toLocaleString()} icon="📄" subtitle={`${(ga4Total.pageViews / Math.max(ga4Total.sessions, 1)).toFixed(1)} / sesja`} color="purple" />
            <KPICard label="Konwersje GA4" value={ga4Total.conversions.toString()} icon="🎯" subtitle={`${(ga4Total.conversions / 30).toFixed(1)} / dzień`} color="green" />
          </div>

          {/* Traffic sources */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="text-md font-semibold text-slate-700 mb-4">🔀 Źródła ruchu</h4>
            {Object.keys(ga4BySource).length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-3xl mb-2">📡</p>
                <p>Brak danych GA4 — kliknij Sync GA4</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(ga4BySource)
                  .sort((a, b) => b[1].sessions - a[1].sessions)
                  .slice(0, 10)
                  .map(([source, data]) => {
                    const pct = ga4Total.sessions > 0 ? (data.sessions / ga4Total.sessions) * 100 : 0;
                    const isAds = source.includes('cpc') || source.includes('paid');
                    return (
                      <div key={source} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAds ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {source}
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className={`h-full rounded-full ${isAds ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-20 text-right">{data.sessions} ({pct.toFixed(1)}%)</span>
                        <span className="text-xs text-slate-400 w-16 text-right">{data.conversions} konw.</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Search Console */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="text-md font-semibold text-slate-700 mb-4">🔍 Search Console — Top zapytania</h4>
            {gscMetrics.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-3xl mb-2">🔍</p>
                <p>Brak danych Search Console — kliknij Sync GSC</p>
                <p className="text-xs mt-1">Wymaga scope <code className="bg-slate-100 px-1 rounded">webmasters.readonly</code></p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50">
                    <th className="px-4 py-2">Zapytanie</th>
                    <th className="px-4 py-2 text-right">Kliknięcia</th>
                    <th className="px-4 py-2 text-right">Wyświetlenia</th>
                    <th className="px-4 py-2 text-right">CTR</th>
                    <th className="px-4 py-2 text-right">Pozycja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gscMetrics.slice(0, 20).map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm font-medium text-slate-700">{m.query}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-600">{m.clicks}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-400">{m.impressions}</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-500">{(m.ctr * 100).toFixed(1)}%</td>
                      <td className="px-4 py-2 text-sm text-right text-slate-500">{Number(m.position).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ EXPERIMENTS ═══ */}
      {tab === 'experiments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">🧪 Eksperymenty A/B</h3>
              <p className="text-sm text-slate-400">Testuj hipotezy i mierz wyniki</p>
            </div>
            <button onClick={() => setNewExpOpen(!newExpOpen)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              {newExpOpen ? 'Anuluj' : '➕ Nowy eksperyment'}
            </button>
          </div>

          {newExpOpen && (
            <div className="bg-white border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-slate-700 mb-4">Nowy eksperyment</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                await supabase.from('ads_experiments').insert({
                  hypothesis: fd.get('hypothesis'),
                  variant_a: { description: fd.get('variant_a') },
                  variant_b: { description: fd.get('variant_b') },
                  campaign_id: fd.get('campaign_id') || null,
                  start_date: fd.get('start_date') || new Date().toISOString().slice(0, 10),
                  end_date: fd.get('end_date'),
                  status: 'running',
                });
                setNewExpOpen(false);
                await loadData();
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Hipoteza</label>
                    <input name="hypothesis" required placeholder="np. Zwiększenie budżetu o 20% poprawi CPL"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Wariant A (kontrolny)</label>
                    <textarea name="variant_a" required placeholder="Opis obecnych ustawień..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Wariant B (zmiana)</label>
                    <textarea name="variant_b" required placeholder="Opis proponowanych zmian..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Kampania</label>
                    <select name="campaign_id" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">— Ogólny —</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Start</label>
                      <input type="date" name="start_date" defaultValue={new Date().toISOString().slice(0, 10)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Koniec</label>
                      <input type="date" name="end_date" required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="mt-4 px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  🚀 Uruchom eksperyment
                </button>
              </form>
            </div>
          )}

          {experiments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              <p className="text-5xl mb-4">🧪</p>
              <p className="text-lg font-medium">Brak eksperymentów</p>
              <p className="text-sm mt-2">Stwórz pierwszy eksperyment A/B aby testować zmiany w kampaniach</p>
            </div>
          ) : (
            experiments.map(exp => (
              <div key={exp.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        exp.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        exp.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {exp.status === 'running' ? '🔬 Trwa' : exp.status === 'completed' ? '✅ Zakończony' : exp.status}
                      </span>
                      {exp.winner && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                          🏆 {exp.winner === 'variant_b' ? 'Wariant B wygrywa' : exp.winner === 'variant_a' ? 'Wariant A wygrywa' : 'Brak zwycięzcy'}
                        </span>
                      )}
                      {exp.confidence_pct && (
                        <span className="text-xs text-slate-400">Confidence: {Number(exp.confidence_pct).toFixed(0)}%</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-800">{exp.hypothesis}</h4>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">Wariant A</p>
                        <p className="text-sm text-slate-600">{typeof exp.variant_a === 'object' ? (exp.variant_a as any)?.description || JSON.stringify(exp.variant_a) : exp.variant_a}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-400 mb-1">Wariant B</p>
                        <p className="text-sm text-slate-600">{typeof exp.variant_b === 'object' ? (exp.variant_b as any)?.description || JSON.stringify(exp.variant_b) : exp.variant_b}</p>
                      </div>
                    </div>
                    {exp.learnings && (
                      <p className="text-xs text-slate-500 mt-3 bg-green-50 p-2 rounded-lg">💡 {exp.learnings}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-slate-300">
                  <span>{exp.start_date} → {exp.end_date || '…'}</span>
                  {exp.status === 'running' && (
                    <button onClick={async () => {
                      await supabase.from('ads_experiments').update({ status: 'paused' }).eq('id', exp.id);
                      await loadData();
                    }} className="text-yellow-600 hover:underline">⏸ Wstrzymaj</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ KNOWLEDGE BASE ═══ */}
      {tab === 'knowledge' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">📚 Baza wiedzy AI</h3>
              <p className="text-sm text-slate-400">Kontekst i wiedza dla AI Ads Managera</p>
            </div>
            <button onClick={() => setNewKbOpen(!newKbOpen)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              {newKbOpen ? 'Anuluj' : '➕ Dodaj wpis'}
            </button>
          </div>

          {newKbOpen && (
            <div className="bg-white border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-slate-700 mb-4">Nowy wpis do bazy wiedzy</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                await supabase.from('ads_knowledge_base').insert({
                  title: fd.get('title'),
                  summary: fd.get('summary'),
                  full_content: fd.get('full_content'),
                  source_type: fd.get('source_type') || 'manual',
                  source_url: fd.get('source_url') || null,
                  tags: (fd.get('tags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || [],
                  relevance_score: 1.0,
                });
                setNewKbOpen(false);
                await loadData();
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tytuł</label>
                    <input name="title" required placeholder="np. Nowe stawki Google Ads Q2 2026"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Typ źródła</label>
                    <select name="source_type" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="manual">Ręczna notatka</option>
                      <option value="blog">Blog / Artykuł</option>
                      <option value="google_update">Update Google Ads</option>
                      <option value="competitor">Analiza konkurencji</option>
                      <option value="internal">Wewnętrzne dane</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">URL źródła</label>
                    <input name="source_url" placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Podsumowanie</label>
                    <textarea name="summary" required placeholder="Krótkie podsumowanie..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-20" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Pełna treść (opcjonalna)</label>
                    <textarea name="full_content" placeholder="Szczegółowa treść..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-24" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tagi (oddzielone przecinkami)</label>
                    <input name="tags" placeholder="budżet, cpc, sezonowość" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                <button type="submit" className="mt-4 px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  💾 Zapisz
                </button>
              </form>
            </div>
          )}

          {knowledgeBase.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              <p className="text-5xl mb-4">📚</p>
              <p className="text-lg font-medium">Baza wiedzy jest pusta</p>
              <p className="text-sm mt-2">Dodaj wpisy aby AI miał lepszy kontekst do analizy kampanii</p>
            </div>
          ) : (
            knowledgeBase.map(kb => (
              <div key={kb.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        kb.source_type === 'google_update' ? 'bg-blue-100 text-blue-700' :
                        kb.source_type === 'google_trends' ? 'bg-indigo-100 text-indigo-700' :
                        kb.source_type === 'competitor' ? 'bg-red-100 text-red-700' :
                        kb.source_type === 'competitor_scrape' ? 'bg-red-100 text-red-700' :
                        kb.source_type === 'competitor_report' ? 'bg-rose-100 text-rose-700' :
                        kb.source_type === 'competitor_analysis' ? 'bg-orange-100 text-orange-700' :
                        kb.source_type === 'pagespeed' ? 'bg-yellow-100 text-yellow-700' :
                        kb.source_type === 'weekly_report' ? 'bg-emerald-100 text-emerald-700' :
                        kb.source_type === 'executive_report' ? 'bg-teal-100 text-teal-700' :
                        kb.source_type === 'blog' ? 'bg-purple-100 text-purple-700' :
                        kb.source_type === 'internal' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{kb.source_type || 'manual'}</span>
                      {kb.tags?.map(tag => (
                        <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                    <h4 className="font-semibold text-slate-800">{kb.title}</h4>
                    <p className="text-sm text-slate-500 mt-1">{kb.summary}</p>
                    {kb.source_url && (
                      <a href={kb.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 inline-block">🔗 {kb.source_url}</a>
                    )}
                  </div>
                  <button onClick={async () => {
                    if (confirm('Usunąć wpis z bazy wiedzy?')) {
                      await supabase.from('ads_knowledge_base').delete().eq('id', kb.id);
                      await loadData();
                    }
                  }} className="text-xs text-red-400 hover:text-red-600 ml-4">🗑</button>
                </div>
                <p className="text-xs text-slate-300 mt-2">{new Date(kb.learned_at).toLocaleString('pl-PL')}</p>
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
