import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Bell,
  BellOff,
  RefreshCw,
  Settings,
  BarChart3,
  Hand,
  Wrench,
  X,
  Check,
  Bot,
  BrainCircuit,
  AlertTriangle,
  Save,
  Calendar,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getActiveSessions,
  getAllSessions,
  getUnreadCounts,
  takeOverSession,
  type ChatSession,
} from '../services/database/chat.service';
import { playNewChatSound, playNewMessageSound, playHumanRequestSound } from '../utils/notificationSound';

// ═══════════════════════════════════════════════
// Chat Dashboard — Live Chat Monitor + Settings + Analytics
// ═══════════════════════════════════════════════

type MainTab = 'chats' | 'settings' | 'analytics';
type FilterTab = 'active' | 'human' | 'mine' | 'all';

// Visitor explicitly asked to talk to a human (flag set by the chat widget)
const isHumanRequested = (s: ChatSession): boolean =>
  (s.metadata as { human_requested?: boolean } | null)?.human_requested === true;

// ─── Widget Config (stored in app_config table) ─────────────────────

interface WidgetConfig {
  enabled: boolean;
  greeting: string;
  quickQuestions: string[];
  botName: string;
  botTitle: string;
  primaryColor: string;
  position: 'right' | 'left';
  showOnPages: string;
  autoOpenDelay: number;
  bubbleMessage: string;
  offlineMessage: string;
}

const DEFAULT_CONFIG: WidgetConfig = {
  enabled: true,
  greeting: 'Guten Tag, ich bin Max, Ihr Fachberater fuer Terrassenueberdachungen bei Polendach24. Ich helfe Ihnen gerne bei allen Fragen rund um Ihr Projekt. Was schwebt Ihnen vor?',
  quickQuestions: [
    'Ich möchte meine Terrasse überdachen — wo fange ich an?',
    'Was kostet eine Terrassenüberdachung bei euch?',
    'Brauche ich eine Baugenehmigung?',
    'Welche Modelle habt ihr?',
  ],
  botName: 'Max',
  botTitle: 'Fachberater Terrassenueberdachungen',
  primaryColor: '#3B82F6',
  position: 'right',
  showOnPages: 'all',
  autoOpenDelay: 0,
  bubbleMessage: 'Haben Sie Fragen? Ich helfe gerne!',
  offlineMessage: 'Wir sind gerade nicht erreichbar. Hinterlassen Sie Ihre Nachricht und wir melden uns!',
};

// ─── Chat Settings (stored in max_chat_settings table) ──────────────

interface ChatSettings {
  id?: string;
  widget_greeting: string;
  widget_accent_color: string;
  widget_position: 'bottom-right' | 'bottom-left';
  working_hours_start: string;
  working_hours_end: string;
  outside_hours_message: string;
  auto_quote_enabled: boolean;
  personality: 'freundlich' | 'professionell' | 'locker';
  system_prompt: string;
}

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  widget_greeting: 'Hallo! Ich bin Max, Ihr persoenlicher Berater fuer Terrassenueberdachungen. Wie kann ich Ihnen helfen?',
  widget_accent_color: '#2563EB',
  widget_position: 'bottom-right',
  working_hours_start: '08:00',
  working_hours_end: '20:00',
  outside_hours_message: 'Wir sind gerade nicht erreichbar. Hinterlassen Sie uns Ihre Kontaktdaten und wir melden uns schnellstmoeglich bei Ihnen!',
  auto_quote_enabled: true,
  personality: 'freundlich',
  system_prompt: '',
};

// ─── Analytics Types ────────────────────────────────────────────────

interface ChatAnalytics {
  sessionsToday: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  statusAi: number;
  statusTaken: number;
  statusClosed: number;
  avgMessagesPerSession: number;
  sessionsWithLeads: number;
  totalSessions: number;
  conversionRate: number;
  sessionsWithQuotes: number;
  quoteRate: number;
}

const EMPTY_ANALYTICS: ChatAnalytics = {
  sessionsToday: 0,
  sessionsThisWeek: 0,
  sessionsThisMonth: 0,
  statusAi: 0,
  statusTaken: 0,
  statusClosed: 0,
  avgMessagesPerSession: 0,
  sessionsWithLeads: 0,
  totalSessions: 0,
  conversionRate: 0,
  sessionsWithQuotes: 0,
  quoteRate: 0,
};

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function ChatDashboardPage() {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>('chats');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Chat settings state
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [chatSettingsSaving, setChatSettingsSaving] = useState(false);
  const [chatSettingsSaved, setChatSettingsSaved] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<ChatAnalytics>(EMPTY_ANALYTICS);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Sound notification tracking
  const prevSessionIdsRef = useRef<Set<string>>(new Set());
  const prevMessageCountRef = useRef<number>(0);
  const prevHumanRequestedIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const soundEnabledRef = useRef(true);

  // ─── Get current user ─────────────────────────────────────────────

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
    loadConfig();
    loadChatSettings();
  }, []);

  // ─── Widget Config (app_config table) ─────────────────────────────

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'chat_widget_config')
        .single();
      if (data?.value) {
        setConfig({ ...DEFAULT_CONFIG, ...(data.value as any) });
      }
    } catch {
      // Table might not exist, use defaults
    }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      await supabase
        .from('app_config')
        .upsert({ key: 'chat_widget_config', value: config as any, updated_at: new Date().toISOString() });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
      localStorage.setItem('chat_widget_config', JSON.stringify(config));
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } finally {
      setConfigSaving(false);
    }
  };

  // ─── Chat Settings (max_chat_settings table) ─────────────────────

  const loadChatSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('max_chat_settings')
        .select('*')
        .limit(1)
        .single();
      if (data && !error) {
        setChatSettings({
          id: data.id,
          widget_greeting: data.widget_greeting ?? DEFAULT_CHAT_SETTINGS.widget_greeting,
          widget_accent_color: data.widget_accent_color ?? DEFAULT_CHAT_SETTINGS.widget_accent_color,
          widget_position: data.widget_position ?? DEFAULT_CHAT_SETTINGS.widget_position,
          working_hours_start: data.working_hours_start ?? DEFAULT_CHAT_SETTINGS.working_hours_start,
          working_hours_end: data.working_hours_end ?? DEFAULT_CHAT_SETTINGS.working_hours_end,
          outside_hours_message: data.outside_hours_message ?? DEFAULT_CHAT_SETTINGS.outside_hours_message,
          auto_quote_enabled: data.auto_quote_enabled ?? DEFAULT_CHAT_SETTINGS.auto_quote_enabled,
          personality: data.personality ?? DEFAULT_CHAT_SETTINGS.personality,
          system_prompt: data.system_prompt ?? DEFAULT_CHAT_SETTINGS.system_prompt,
        });
      }
    } catch {
      // Table might not exist — load from localStorage
      const stored = localStorage.getItem('max_chat_settings');
      if (stored) {
        try {
          setChatSettings({ ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(stored) });
        } catch { /* ignore parse error */ }
      }
    }
  };

  const saveChatSettings = async () => {
    setChatSettingsSaving(true);
    try {
      const payload = {
        widget_greeting: chatSettings.widget_greeting,
        widget_accent_color: chatSettings.widget_accent_color,
        widget_position: chatSettings.widget_position,
        working_hours_start: chatSettings.working_hours_start,
        working_hours_end: chatSettings.working_hours_end,
        outside_hours_message: chatSettings.outside_hours_message,
        auto_quote_enabled: chatSettings.auto_quote_enabled,
        personality: chatSettings.personality,
        system_prompt: chatSettings.system_prompt,
        updated_at: new Date().toISOString(),
      };

      if (chatSettings.id) {
        // Update existing row
        await supabase
          .from('max_chat_settings')
          .update(payload)
          .eq('id', chatSettings.id);
      } else {
        // Insert new row
        const { data } = await supabase
          .from('max_chat_settings')
          .upsert(payload)
          .select('id')
          .single();
        if (data?.id) {
          setChatSettings((prev) => ({ ...prev, id: data.id }));
        }
      }

      setChatSettingsSaved(true);
      setTimeout(() => setChatSettingsSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save chat settings to Supabase, using localStorage:', err);
      localStorage.setItem('max_chat_settings', JSON.stringify(chatSettings));
      setChatSettingsSaved(true);
      setTimeout(() => setChatSettingsSaved(false), 2500);
    } finally {
      setChatSettingsSaving(false);
    }
  };

  // ─── Analytics ────────────────────────────────────────────────────

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const now = new Date();

      // Start of today
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Start of this week (Monday)
      const dayOfWeek = now.getDay() || 7; // Sunday = 7
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      // Start of this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all sessions
      const { data: allSessions } = await supabase
        .from('max_chat_sessions')
        .select('id, created_at, status, lead_id, message_count, metadata');

      if (!allSessions) {
        setAnalytics(EMPTY_ANALYTICS);
        return;
      }

      const total = allSessions.length;
      const today = allSessions.filter((s) => s.created_at >= startOfToday).length;
      const week = allSessions.filter((s) => s.created_at >= startOfWeek.toISOString()).length;
      const month = allSessions.filter((s) => s.created_at >= startOfMonth).length;

      const statusAi = allSessions.filter((s) => s.status === 'ai').length;
      const statusTaken = allSessions.filter((s) => s.status === 'taken').length;
      const statusClosed = allSessions.filter((s) => s.status === 'closed').length;

      const totalMessages = allSessions.reduce((sum, s) => sum + (s.message_count || 0), 0);
      const avgMessages = total > 0 ? Math.round((totalMessages / total) * 10) / 10 : 0;

      const withLeads = allSessions.filter((s) => s.lead_id != null).length;
      const conversionRate = total > 0 ? Math.round((withLeads / total) * 1000) / 10 : 0;

      // Check for sessions that have quote_id in metadata
      const withQuotes = allSessions.filter((s) => {
        const meta = s.metadata as Record<string, unknown> | null;
        return meta?.quote_id || meta?.offer_id || meta?.angebot_id;
      }).length;
      const quoteRate = total > 0 ? Math.round((withQuotes / total) * 1000) / 10 : 0;

      setAnalytics({
        sessionsToday: today,
        sessionsThisWeek: week,
        sessionsThisMonth: month,
        statusAi,
        statusTaken,
        statusClosed,
        avgMessagesPerSession: avgMessages,
        sessionsWithLeads: withLeads,
        totalSessions: total,
        conversionRate,
        sessionsWithQuotes: withQuotes,
        quoteRate,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // ─── Load sessions ────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        filter === 'all' ? await getAllSessions() : await getActiveSessions();
      setSessions(data);
      // Unread badges: number of customer messages since the session was last viewed
      try {
        const counts = await getUnreadCounts(data.map((s) => s.id));
        setUnreadCounts(counts);
      } catch (e) {
        console.warn('Failed to load unread counts:', e);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load analytics when tab is selected
  useEffect(() => {
    if (mainTab === 'analytics') {
      loadAnalytics();
    }
  }, [mainTab, loadAnalytics]);

  // ─── Sound notification logic ─────────────────────────────────────

  useEffect(() => {
    const humanRequestedIds = sessions.filter(isHumanRequested).map((s) => s.id);

    if (isInitialLoadRef.current) {
      // On initial load, just store current state without playing sounds
      const ids = new Set(sessions.map((s) => s.id));
      prevSessionIdsRef.current = ids;
      prevMessageCountRef.current = sessions.reduce((sum, s) => sum + (s.message_count || 0), 0);
      prevHumanRequestedIdsRef.current = new Set(humanRequestedIds);
      isInitialLoadRef.current = false;
      return;
    }

    if (!soundEnabledRef.current) {
      prevSessionIdsRef.current = new Set(sessions.map((s) => s.id));
      prevMessageCountRef.current = sessions.reduce((sum, s) => sum + (s.message_count || 0), 0);
      prevHumanRequestedIdsRef.current = new Set(humanRequestedIds);
      return;
    }

    const currentTotalMessages = sessions.reduce((sum, s) => sum + (s.message_count || 0), 0);

    // Check for new sessions
    const currentIdsArray = sessions.map((s) => s.id);
    const newSessionFound = currentIdsArray.some((id) => !prevSessionIdsRef.current.has(id));

    // A visitor newly raised their hand for a human -> distinct, urgent sound
    const newHumanRequest = humanRequestedIds.some(
      (id) => !prevHumanRequestedIdsRef.current.has(id)
    );

    if (newHumanRequest) {
      playHumanRequestSound();
    } else if (newSessionFound) {
      playNewChatSound();
    } else if (currentTotalMessages > prevMessageCountRef.current) {
      // New messages in existing sessions
      playNewMessageSound();
    }

    prevSessionIdsRef.current = new Set(currentIdsArray);
    prevMessageCountRef.current = currentTotalMessages;
    prevHumanRequestedIdsRef.current = new Set(humanRequestedIds);
  }, [sessions]);

  // ─── Realtime subscription ────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('max-chat-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'max_chat_sessions' },
        () => loadSessions()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'max_chat_messages' },
        () => loadSessions()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadSessions]);

  // ─── Helpers ──────────────────────────────────────────────────────

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'active') return s.status === 'ai';
    if (filter === 'human') return isHumanRequested(s) && s.status !== 'closed';
    if (filter === 'mine') return s.status === 'taken' && s.taken_by === currentUserId;
    return true;
  });

  const handleTakeOver = async (session: ChatSession) => {
    if (!currentUserId || !currentUserName) return;
    const firstName = currentUserName.split(' ')[0];
    const success = await takeOverSession(session.id, currentUserId, firstName);
    if (success) navigate(`/chat/${session.id}`);
  };

  // Absolute date+time, formatted German: "Heute 14:32", "Gestern 09:05", "08.06.2026 14:32"
  const formatDateTimeDE = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return `Heute ${time}`;
    if (d.toDateString() === yesterday.toDateString()) return `Gestern ${time}`;
    const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${date} ${time}`;
  };

  const activeCounts = sessions.filter((s) => s.status === 'ai').length;
  const myCounts = sessions.filter((s) => s.status === 'taken' && s.taken_by === currentUserId).length;
  const humanCounts = sessions.filter((s) => isHumanRequested(s) && s.status !== 'closed').length;
  const totalMessages = sessions.reduce((sum, s) => sum + (s.message_count || 0), 0);

  // ═══════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare size={24} className="text-blue-600" /> Live Chat
            {activeCounts > 0 && (
              <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                {activeCounts} aktiv
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Max AI Berater — Chatverlaeufe, Uebernahme und Widget-Einstellungen
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { soundEnabledRef.current = !soundEnabledRef.current; }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            title={soundEnabledRef.current ? 'Benachrichtigungston ausschalten' : 'Benachrichtigungston einschalten'}
          >
            {soundEnabledRef.current ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button
            onClick={loadSessions}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Aktualisieren
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{activeCounts}</div>
          <div className="text-xs text-gray-500 mt-1">Aktive Chats</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{myCounts}</div>
          <div className="text-xs text-gray-500 mt-1">Meine Uebernahmen</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
          <div className="text-xs text-gray-500 mt-1">Gesamt Sitzungen</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{totalMessages}</div>
          <div className="text-xs text-gray-500 mt-1">Nachrichten gesamt</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setMainTab('chats')}
          className={`px-5 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1.5 ${
            mainTab === 'chats' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare size={16} /> Chats
        </button>
        <button
          onClick={() => setMainTab('settings')}
          className={`px-5 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1.5 ${
            mainTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings size={16} /> Widget-Einstellungen
        </button>
        <button
          onClick={() => setMainTab('analytics')}
          className={`px-5 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1.5 ${
            mainTab === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 size={16} /> Statistiken
        </button>
      </div>

      {/* ═══ CHATS TAB ═══ */}
      {mainTab === 'chats' && (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-1 bg-gray-50 rounded-lg p-1 mb-4 w-fit">
            {[
              { key: 'active' as FilterTab, label: 'Aktiv (Max)', count: activeCounts, urgent: false },
              { key: 'human' as FilterTab, label: <span className="inline-flex items-center gap-1"><Hand size={14} /> Wartet auf Mensch</span>, count: humanCounts, urgent: true },
              { key: 'mine' as FilterTab, label: 'Meine', count: myCounts, urgent: false },
              { key: 'all' as FilterTab, label: 'Alle', count: sessions.length, urgent: false },
            ].map(({ key, label, count, urgent }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    urgent
                      ? 'bg-red-100 text-red-700'
                      : filter === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sessions List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="flex justify-center mb-3">
                {filter === 'active'
                  ? <span className="inline-block w-8 h-8 rounded-full bg-green-500" />
                  : filter === 'human'
                  ? <Hand size={40} className="text-gray-400" />
                  : <MessageSquare size={40} className="text-gray-400" />}
              </div>
              <p className="text-lg font-medium">
                {filter === 'active'
                  ? 'Keine aktiven Chats'
                  : filter === 'human'
                  ? 'Niemand wartet auf einen Mitarbeiter'
                  : filter === 'mine'
                  ? 'Keine uebernommenen Chats'
                  : 'Noch keine Chatverlaeufe'}
              </p>
              <p className="text-sm mt-1">
                {filter === 'active' && 'Neue Chats erscheinen hier automatisch, sobald ein Besucher Max anschreibt.'}
                {filter === 'human' && 'Sobald ein Besucher einen Mitarbeiter anfordert, erscheint er hier.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const wantsHuman = isHumanRequested(session) && session.status !== 'closed';
                const unread = unreadCounts.get(session.id) || 0;
                return (
                <div
                  key={session.id}
                  className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer ${
                    wantsHuman
                      ? 'border-red-300 ring-1 ring-red-200 bg-red-50/30 hover:border-red-400'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => navigate(`/chat/${session.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-1 relative">
                      <div className={`w-3 h-3 rounded-full ${
                        session.status === 'ai' ? 'bg-green-500 animate-pulse'
                        : session.status === 'taken' ? 'bg-blue-500'
                        : 'bg-gray-300'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {session.customer_name || 'Besucher'}
                        </span>
                        {unread > 0 && (
                          <span className="text-[11px] font-bold text-white bg-red-500 min-w-[20px] text-center px-1.5 py-0.5 rounded-full">
                            {unread}
                          </span>
                        )}
                        {wantsHuman && (
                          <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full animate-pulse inline-flex items-center gap-1">
                            <Hand size={12} /> Möchte Mitarbeiter
                          </span>
                        )}
                        {session.customer_data?.plz && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            PLZ {session.customer_data.plz}
                          </span>
                        )}
                        {session.page_url && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">{session.page_url}</span>
                        )}
                      </div>
                      {session.last_message && (
                        <p className={`text-sm truncate ${unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{session.last_message}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                        <span title={session.last_message_at ? new Date(session.last_message_at).toLocaleString('de-DE') : ''}>
                          {formatDateTimeDE(session.last_message_at) || '—'}
                        </span>
                        <span>{session.message_count} Nachrichten</span>
                        {session.status === 'taken' ? (
                          <span className="text-blue-600 font-medium">
                            Übernommen von {session.taken_by_name || 'Berater'}
                            {session.taken_at ? ` · ${formatDateTimeDE(session.taken_at)}` : ''}
                          </span>
                        ) : session.status === 'ai' ? (
                          <span className="text-green-600 font-medium">Max</span>
                        ) : (
                          <span className="text-gray-400 font-medium">Geschlossen</span>
                        )}
                        {session.lead_id && <span className="text-green-500 font-medium">Lead gespeichert</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {session.status === 'ai' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTakeOver(session); }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Uebernehmen
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/chat/${session.id}`); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Ansehen
                      </button>
                      {session.lead_id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/leads'); }}
                          className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Lead
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {mainTab === 'settings' && (
        <div className="space-y-6">
          {/* ─── Section: Widget Config (app_config) ─── */}
          <div className="border-b border-gray-200 pb-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Wrench size={18} className="text-gray-600" /> Widget-Konfiguration</h2>
            <p className="text-xs text-gray-500">Grundeinstellungen fuer das Chat-Widget auf der Website</p>
          </div>

          {/* Widget ON/OFF */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Chat-Widget aktiv</h3>
                <p className="text-sm text-gray-500 mt-1">Widget auf polendach24.de ein-/ausschalten</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`relative w-14 h-7 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Bot Personality */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Bot-Persoenlichkeit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={config.botName}
                  onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel / Rolle</label>
                <input
                  type="text"
                  value={config.botTitle}
                  onChange={(e) => setConfig({ ...config, botTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Begruessung (erste Nachricht)</label>
              <textarea
                value={config.greeting}
                onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offline-Nachricht (ausserhalb Geschaeftszeiten)</label>
              <textarea
                value={config.offlineMessage}
                onChange={(e) => setConfig({ ...config, offlineMessage: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Questions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Schnellfragen (Quick-Reply Buttons)</h3>
            <p className="text-sm text-gray-500">Werden dem Besucher als klickbare Buttons angezeigt</p>
            {config.quickQuestions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    const qs = [...config.quickQuestions];
                    qs[i] = e.target.value;
                    setConfig({ ...config, quickQuestions: qs });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Frage ${i + 1}`}
                />
                <button
                  onClick={() => {
                    const qs = config.quickQuestions.filter((_, idx) => idx !== i);
                    setConfig({ ...config, quickQuestions: qs });
                  }}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm flex items-center"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {config.quickQuestions.length < 6 && (
              <button
                onClick={() => setConfig({ ...config, quickQuestions: [...config.quickQuestions, ''] })}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Frage hinzufuegen
              </button>
            )}
          </div>

          {/* Bubble & Engagement */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Engagement-Blase</h3>
            <p className="text-sm text-gray-500">Wird nach einigen Sekunden neben dem Chat-Button angezeigt</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bubble-Nachricht</label>
              <input
                type="text"
                value={config.bubbleMessage}
                onChange={(e) => setConfig({ ...config, bubbleMessage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Oeffnen nach (Sekunden, 0 = deaktiviert)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={config.autoOpenDelay}
                onChange={(e) => setConfig({ ...config, autoOpenDelay: parseInt(e.target.value) || 0 })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Erscheinungsbild</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hauptfarbe</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select
                  value={config.position}
                  onChange={(e) => setConfig({ ...config, position: e.target.value as 'right' | 'left' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="right">Rechts unten</option>
                  <option value="left">Links unten</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seiten anzeigen</label>
              <input
                type="text"
                value={config.showOnPages}
                onChange={(e) => setConfig({ ...config, showOnPages: e.target.value })}
                placeholder="all (oder kommagetrennt: /, /kontakt, /produkte)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">"all" = ueberall, oder kommagetrennt: /, /kontakt, /produkte</p>
            </div>
          </div>

          {/* Save Widget Config Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={saveConfig}
              disabled={configSaving}
              className={`px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all ${
                configSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              {configSaving ? 'Speichern...' : 'Widget-Einstellungen speichern'}
            </button>
            {configSaved && (
              <span className="text-sm text-green-600 font-medium animate-pulse inline-flex items-center gap-1"><Check size={16} /> Gespeichert!</span>
            )}
          </div>

          {/* ─── Divider ─── */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Bot size={18} className="text-gray-600" /> Max Chat-Einstellungen</h2>
            <p className="text-xs text-gray-500">Erweiterte Einstellungen fuer den AI-Berater</p>
          </div>

          {/* Greeting Message */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Begruessung</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Widget-Begruessung</label>
              <p className="text-xs text-gray-400 mb-2">Die erste Nachricht die Besucher sehen wenn sie den Chat oeffnen</p>
              <textarea
                value={chatSettings.widget_greeting}
                onChange={(e) => setChatSettings({ ...chatSettings, widget_greeting: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Accent Color & Position */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Darstellung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Akzentfarbe</label>
                <p className="text-xs text-gray-400 mb-2">Hauptfarbe des Chat-Widgets</p>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={chatSettings.widget_accent_color}
                    onChange={(e) => setChatSettings({ ...chatSettings, widget_accent_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={chatSettings.widget_accent_color}
                    onChange={(e) => setChatSettings({ ...chatSettings, widget_accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                  <div
                    className="w-12 h-12 rounded-lg border"
                    style={{ backgroundColor: chatSettings.widget_accent_color }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Widget-Position</label>
                <p className="text-xs text-gray-400 mb-2">Wo das Chat-Widget auf der Seite angezeigt wird</p>
                <select
                  value={chatSettings.widget_position}
                  onChange={(e) => setChatSettings({ ...chatSettings, widget_position: e.target.value as 'bottom-right' | 'bottom-left' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bottom-right">Rechts unten</option>
                  <option value="bottom-left">Links unten</option>
                </select>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Geschaeftszeiten</h3>
            <p className="text-xs text-gray-400">Ausserhalb dieser Zeiten wird eine Offline-Nachricht angezeigt</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startzeit</label>
                <input
                  type="time"
                  value={chatSettings.working_hours_start}
                  onChange={(e) => setChatSettings({ ...chatSettings, working_hours_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
                <input
                  type="time"
                  value={chatSettings.working_hours_end}
                  onChange={(e) => setChatSettings({ ...chatSettings, working_hours_end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offline-Nachricht</label>
              <p className="text-xs text-gray-400 mb-2">Wird angezeigt wenn Besucher ausserhalb der Geschaeftszeiten schreiben</p>
              <textarea
                value={chatSettings.outside_hours_message}
                onChange={(e) => setChatSettings({ ...chatSettings, outside_hours_message: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Personality & Auto-Quote */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Verhalten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max's Persoenlichkeit</label>
                <p className="text-xs text-gray-400 mb-2">Bestimmt den Tonfall der KI-Antworten</p>
                <select
                  value={chatSettings.personality}
                  onChange={(e) => setChatSettings({ ...chatSettings, personality: e.target.value as ChatSettings['personality'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="freundlich">Freundlich — warm und einladend</option>
                  <option value="professionell">Professionell — sachlich und kompetent</option>
                  <option value="locker">Locker — entspannt und nahbar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Automatisches Angebot</label>
                <p className="text-xs text-gray-400 mb-2">Max erstellt automatisch ein Angebot wenn genuegend Daten vorhanden</p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => setChatSettings({ ...chatSettings, auto_quote_enabled: !chatSettings.auto_quote_enabled })}
                    className={`relative w-14 h-7 rounded-full transition-colors ${chatSettings.auto_quote_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${chatSettings.auto_quote_enabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-600">
                    {chatSettings.auto_quote_enabled ? 'Aktiviert' : 'Deaktiviert'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Max — Wissen & Anweisungen (System-Prompt) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <BrainCircuit size={18} className="text-gray-600" /> Max — Wissen &amp; Anweisungen (System-Prompt)
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Steuert, was Max weiß und wie er antwortet. Änderungen wirken sofort auf der Website.
              </p>
            </div>

            {/* Amber warning — affects the live bot */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Achtung: Dieser Text steuert den <strong>live</strong> Chatbot auf polendach24.de. Jede Speicherung
                wirkt sofort auf alle laufenden und neuen Gespräche.
              </p>
            </div>

            <div>
              <textarea
                value={chatSettings.system_prompt}
                onChange={(e) => setChatSettings({ ...chatSettings, system_prompt: e.target.value })}
                rows={18}
                spellCheck={false}
                placeholder="Wissen und Anweisungen für Max…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono leading-relaxed resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="mt-1 text-right text-xs text-gray-400">
                {chatSettings.system_prompt.length.toLocaleString('de-DE')} Zeichen
              </div>
            </div>
          </div>

          {/* Save Chat Settings Button */}
          <div className="flex items-center gap-4 pb-8">
            <button
              onClick={saveChatSettings}
              disabled={chatSettingsSaving}
              className={`px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all flex items-center gap-1.5 ${
                chatSettingsSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-sm'
              }`}
            >
              {chatSettingsSaving ? 'Speichern...' : <><Save size={16} /> Chat-Einstellungen speichern</>}
            </button>
            {chatSettingsSaved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <Check size={16} className="animate-pulse" /> Einstellungen gespeichert!
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {mainTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Time-Based Stats */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar size={16} /> Sitzungen nach Zeitraum</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-gray-900">{analytics.sessionsToday}</div>
                        <div className="text-sm text-gray-500 mt-1">Heute</div>
                      </div>
                      <Calendar size={40} className="text-gray-900 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-gray-900">{analytics.sessionsThisWeek}</div>
                        <div className="text-sm text-gray-500 mt-1">Diese Woche</div>
                      </div>
                      <CalendarDays size={40} className="text-gray-900 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-gray-900">{analytics.sessionsThisMonth}</div>
                        <div className="text-sm text-gray-500 mt-1">Diesen Monat</div>
                      </div>
                      <CalendarRange size={40} className="text-gray-900 opacity-20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><RefreshCw size={16} /> Status-Verteilung</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
                      <div>
                        <div className="text-2xl font-bold text-green-600">{analytics.statusAi}</div>
                        <div className="text-sm text-gray-500">Max (KI) aktiv</div>
                      </div>
                    </div>
                    {analytics.totalSessions > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${(analytics.statusAi / analytics.totalSessions) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{analytics.statusTaken}</div>
                        <div className="text-sm text-gray-500">Uebernommen</div>
                      </div>
                    </div>
                    {analytics.totalSessions > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(analytics.statusTaken / analytics.totalSessions) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gray-400" />
                      <div>
                        <div className="text-2xl font-bold text-gray-600">{analytics.statusClosed}</div>
                        <div className="text-sm text-gray-500">Geschlossen</div>
                      </div>
                    </div>
                    {analytics.totalSessions > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-gray-400 h-2 rounded-full transition-all"
                            style={{ width: `${(analytics.statusClosed / analytics.totalSessions) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingUp size={16} /> Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-3xl font-bold text-purple-600">{analytics.avgMessagesPerSession}</div>
                    <div className="text-sm text-gray-500 mt-1">Nachrichten / Sitzung</div>
                    <p className="text-xs text-gray-400 mt-2">Durchschnittliche Gespraechslaenge</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-3xl font-bold text-gray-900">{analytics.totalSessions}</div>
                    <div className="text-sm text-gray-500 mt-1">Sitzungen gesamt</div>
                    <p className="text-xs text-gray-400 mt-2">Alle Chatverlaeufe insgesamt</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-green-600">{analytics.sessionsWithLeads}</span>
                      <span className="text-lg text-green-400">({analytics.conversionRate}%)</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Leads generiert</div>
                    <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1">Konversionsrate: Chat <ArrowRight size={12} /> Lead</p>
                    {analytics.totalSessions > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${analytics.conversionRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-orange-600">{analytics.sessionsWithQuotes}</span>
                      <span className="text-lg text-orange-400">({analytics.quoteRate}%)</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Angebote erstellt</div>
                    <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1">Angebotsrate: Chat <ArrowRight size={12} /> Angebot</p>
                    {analytics.totalSessions > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${analytics.quoteRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refresh button */}
              <div className="flex justify-end">
                <button
                  onClick={loadAnalytics}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Statistiken aktualisieren
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
