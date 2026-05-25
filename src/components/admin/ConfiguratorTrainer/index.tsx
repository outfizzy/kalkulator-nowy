import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Play, Brain, TestTube, Settings, ChevronRight, AlertCircle,
  CheckCircle, Clock, Loader2, Database, Wifi, X, Save, Trash2,
  RefreshCw, Eye, BarChart3, Globe, Lock, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────
interface SupplierConfigurator {
  id: string;
  supplier_key: string;
  display_name: string;
  configurator_url: string;
  login_url: string | null;
  login_required: boolean;
  credentials: { username?: string; password?: string } | null;
  status: 'new' | 'recording' | 'learning' | 'testing' | 'ready' | 'broken';
  confidence_score: number | null;
  last_test_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ConfiguratorRecording {
  id: string;
  supplier_id: string;
  supplier_key: string;
  model: string | null;
  status: 'recording' | 'completed' | 'analyzing' | 'analyzed' | 'verified' | 'failed';
  steps_count: number;
  final_price: number | null;
  duration_seconds: number | null;
  recorded_at: string;
  created_at: string;
}

interface KnowledgeNode {
  id: string;
  supplier_id: string;
  key: string;
  name: string;
  node_type: string;
  required: boolean;
  options_count: number;
  seen_count: number;
}

interface KnowledgeEdge {
  id: string;
  supplier_id: string;
  from_node: string;
  to_node: string;
  edge_type: string;
  condition: string | null;
  confidence: number;
}

interface TestResult {
  id: string;
  supplier_id: string;
  config_summary: string;
  our_price: number;
  supplier_price: number;
  price_diff_pct: number;
  status: 'pass' | 'fail' | 'error';
  duration_ms: number;
  tested_at: string;
}

type TabId = 'suppliers' | 'recordings' | 'knowledge' | 'tests';

// ─── Status Config ──────────────────────────────────────────
const SUPPLIER_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  new:       { label: 'Nowy',       bg: 'bg-slate-100',  text: 'text-slate-700' },
  recording: { label: 'Nagrywanie', bg: 'bg-blue-100',   text: 'text-blue-700' },
  learning:  { label: 'Uczenie',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  testing:   { label: 'Testowanie', bg: 'bg-orange-100', text: 'text-orange-700' },
  ready:     { label: 'Gotowy',     bg: 'bg-green-100',  text: 'text-green-700' },
  broken:    { label: 'Błąd',       bg: 'bg-red-100',    text: 'text-red-700' },
};

const RECORDING_STATUS: Record<string, { label: string; bg: string; text: string; pulse?: boolean }> = {
  recording: { label: 'Nagrywanie', bg: 'bg-blue-100',    text: 'text-blue-700',    pulse: true },
  completed: { label: 'Ukończone',  bg: 'bg-green-100',   text: 'text-green-700' },
  analyzing: { label: 'Analizowanie',bg: 'bg-yellow-100', text: 'text-yellow-700' },
  analyzed:  { label: 'Przeanalizowane', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  verified:  { label: 'Zweryfikowane', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  failed:    { label: 'Błąd',       bg: 'bg-red-100',     text: 'text-red-700' },
};

// ─── Helpers ────────────────────────────────────────────────
const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const fmtDuration = (seconds: number | null) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const fmtPrice = (price: number | null) => {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'EUR' }).format(price);
};

// ─── Component ──────────────────────────────────────────────
export const ConfiguratorTrainerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('suppliers');
  const [loading, setLoading] = useState(true);

  // Data
  const [suppliers, setSuppliers] = useState<SupplierConfigurator[]>([]);
  const [recordings, setRecordings] = useState<ConfiguratorRecording[]>([]);
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Filters
  const [recordingFilter, setRecordingFilter] = useState<string>('all');
  const [knowledgeSupplier, setKnowledgeSupplier] = useState<string>('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierConfigurator | null>(null);
  const [formData, setFormData] = useState({
    supplier_key: '',
    display_name: '',
    configurator_url: '',
    login_url: '',
    login_required: false,
    username: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── Data Loading ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [suppRes, recRes, nodesRes, edgesRes, testsRes] = await Promise.all([
        supabase.from('supplier_configurators').select('*').order('created_at', { ascending: false }),
        supabase.from('configurator_recordings').select('*').order('recorded_at', { ascending: false }).limit(100),
        supabase.from('configurator_knowledge_nodes').select('*').order('seen_count', { ascending: false }).limit(200),
        supabase.from('configurator_knowledge_edges').select('*').order('confidence', { ascending: false }).limit(200),
        supabase.from('configurator_test_results').select('*').order('tested_at', { ascending: false }).limit(100),
      ]);

      if (suppRes.data) setSuppliers(suppRes.data);
      if (recRes.data) setRecordings(recRes.data);
      if (nodesRes.data) setNodes(nodesRes.data);
      if (edgesRes.data) setEdges(edgesRes.data);
      if (testsRes.data) setTestResults(testsRes.data);

      // Auto-select first supplier for knowledge tab
      if (suppRes.data && suppRes.data.length > 0 && !knowledgeSupplier) {
        setKnowledgeSupplier(suppRes.data[0].id);
      }
    } catch (err) {
      console.error('Error loading configurator trainer data:', err);
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  }, [knowledgeSupplier]);

  useEffect(() => { loadData(); }, []);

  // ─── Stats ───────────────────────────────────────────────
  const avgConfidence = testResults.length > 0
    ? Math.round(testResults.reduce((sum, t) => sum + (100 - Math.abs(t.price_diff_pct)), 0) / testResults.length)
    : 0;

  // ─── Supplier CRUD ───────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData({ supplier_key: '', display_name: '', configurator_url: '', login_url: '', login_required: false, username: '', password: '' });
    setShowAddModal(true);
  };

  const handleEditSupplier = (s: SupplierConfigurator) => {
    setEditingSupplier(s);
    setFormData({
      supplier_key: s.supplier_key,
      display_name: s.display_name,
      configurator_url: s.configurator_url,
      login_url: s.login_url || '',
      login_required: s.login_required,
      username: s.credentials?.username || '',
      password: s.credentials?.password || '',
    });
    setShowAddModal(true);
  };

  const handleSubmitSupplier = async () => {
    if (!formData.supplier_key || !formData.display_name || !formData.configurator_url) {
      toast.error('Wypełnij wymagane pola');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_key: formData.supplier_key,
        display_name: formData.display_name,
        configurator_url: formData.configurator_url,
        login_url: formData.login_url || null,
        login_required: formData.login_required,
        credentials: formData.login_required ? { username: formData.username, password: formData.password } : null,
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from('supplier_configurators')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingSupplier.id);
        if (error) throw error;
        toast.success('Dostawca zaktualizowany');
      } else {
        const { error } = await supabase
          .from('supplier_configurators')
          .insert({ ...payload, status: 'new' });
        if (error) throw error;
        toast.success('Dostawca dodany');
      }

      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      console.error('Error saving supplier:', err);
      toast.error('Błąd zapisu: ' + (err.message || 'Nieznany błąd'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego dostawcę? Zostaną usunięte wszystkie powiązane dane.')) return;
    try {
      const { error } = await supabase.from('supplier_configurators').delete().eq('id', id);
      if (error) throw error;
      toast.success('Dostawca usunięty');
      loadData();
    } catch (err: any) {
      toast.error('Błąd usuwania: ' + err.message);
    }
  };

  // ─── Actions ─────────────────────────────────────────────
  const handleStartRecording = async (supplier: SupplierConfigurator) => {
    toast.success(`🎬 Rozpoczynam nagrywanie dla ${supplier.display_name}...`);
    try {
      const { error } = await supabase.from('supplier_configurators')
        .update({ status: 'recording', updated_at: new Date().toISOString() })
        .eq('id', supplier.id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      toast.error('Błąd uruchamiania nagrywania: ' + err.message);
    }
  };

  const handleStartTest = async (supplier: SupplierConfigurator) => {
    toast.success(`🧪 Uruchamiam testy dla ${supplier.display_name}...`);
    try {
      const { error } = await supabase.from('supplier_configurators')
        .update({ status: 'testing', updated_at: new Date().toISOString() })
        .eq('id', supplier.id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      toast.error('Błąd uruchamiania testów: ' + err.message);
    }
  };

  const handleAnalyzeRecording = async (recording: ConfiguratorRecording) => {
    toast.success('🧠 Rozpoczynam analizę AI nagrania...');
    try {
      const { error } = await supabase.from('configurator_recordings')
        .update({ status: 'analyzing' })
        .eq('id', recording.id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      toast.error('Błąd analizy: ' + err.message);
    }
  };

  // ─── Filtered data ──────────────────────────────────────
  const filteredRecordings = recordingFilter === 'all'
    ? recordings
    : recordings.filter(r => r.supplier_id === recordingFilter);

  const filteredNodes = knowledgeSupplier
    ? nodes.filter(n => n.supplier_id === knowledgeSupplier)
    : nodes;

  const filteredEdges = knowledgeSupplier
    ? edges.filter(e => e.supplier_id === knowledgeSupplier)
    : edges;

  const selectedSupplierName = suppliers.find(s => s.id === knowledgeSupplier)?.display_name || '';

  // ─── Tab definitions ────────────────────────────────────
  const tabs: { id: TabId; label: string }[] = [
    { id: 'suppliers',  label: '🏭 Dostawcy' },
    { id: 'recordings', label: '🎬 Nagrania' },
    { id: 'knowledge',  label: '🧠 Graf wiedzy' },
    { id: 'tests',      label: '🧪 Testy' },
  ];

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════
  return (
    <div className="space-y-5 pb-12 max-w-[1600px] mx-auto">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">🤖 AI Configurator Trainer</h1>
            <p className="text-white/70 text-sm">System uczenia się konfiguratorów dostawców</p>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dostawcy</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{suppliers.length}</p>
          <p className="text-xs text-green-600 mt-1">{suppliers.filter(s => s.status === 'ready').length} gotowych</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nagrania</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{recordings.length}</p>
          <p className="text-xs text-blue-600 mt-1">{recordings.filter(r => r.status === 'verified').length} zweryfikowanych</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
              <TestTube className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Testy</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{testResults.length}</p>
          <p className="text-xs text-emerald-600 mt-1">{testResults.filter(t => t.status === 'pass').length} zaliczonych</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Średnia zgodność</p>
          </div>
          <p className="text-3xl font-bold text-slate-800">{avgConfidence > 0 ? `${avgConfidence}%` : '—'}</p>
          <p className="text-xs text-slate-400 mt-1">zgodność cen z dostawcą</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Loading State ═══ */}
      {loading && (
        <div className="py-20 text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Ładowanie danych...</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SUPPLIERS TAB                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-slate-800">Konfiguratorzy dostawców</h2>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Odśwież">
                <RefreshCw className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={handleOpenAddModal}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Dodaj dostawcę
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Dostawca</th>
                    <th className="px-4 py-3">URL</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Ostatni test</th>
                    <th className="px-4 py-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map(supplier => {
                    const st = SUPPLIER_STATUS[supplier.status] || SUPPLIER_STATUS.new;
                    return (
                      <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              {supplier.display_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{supplier.display_name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{supplier.supplier_key}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <a
                              href={supplier.configurator_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs truncate max-w-[200px]"
                            >
                              {supplier.configurator_url.replace(/^https?:\/\//, '')}
                            </a>
                            {supplier.login_required && (
                              <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" title="Wymaga logowania" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                            {supplier.status === 'recording' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />}
                            {supplier.status === 'ready' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {supplier.status === 'broken' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {supplier.confidence_score !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    supplier.confidence_score >= 90 ? 'bg-emerald-500' :
                                    supplier.confidence_score >= 70 ? 'bg-blue-500' :
                                    supplier.confidence_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(supplier.confidence_score, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{supplier.confidence_score}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {fmtDate(supplier.last_test_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartRecording(supplier)}
                              className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                              title="Nagrywaj"
                            >
                              <Play className="w-3 h-3" /> Nagrywaj
                            </button>
                            <button
                              onClick={() => handleStartTest(supplier)}
                              className="px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1"
                              title="Testuj"
                            >
                              <TestTube className="w-3 h-3" /> Testuj
                            </button>
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                              title="Edytuj"
                            >
                              <Settings className="w-3 h-3" /> Edytuj
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Usuń"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm font-medium">Brak dostawców</p>
                        <p className="text-slate-400 text-xs mt-1">Dodaj pierwszego dostawcę, aby rozpocząć naukę konfiguratora</p>
                        <button
                          onClick={handleOpenAddModal}
                          className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                        >
                          <Plus className="w-4 h-4 inline mr-1" /> Dodaj dostawcę
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* RECORDINGS TAB                                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'recordings' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-slate-800">Nagrania konfiguratorów</h2>
            <div className="flex items-center gap-3">
              <select
                value={recordingFilter}
                onChange={e => setRecordingFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Wszystkie dostawcy</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </select>
              <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Odśwież">
                <RefreshCw className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Dostawca</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Kroki</th>
                    <th className="px-4 py-3">Cena końcowa</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Czas trwania</th>
                    <th className="px-4 py-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecordings.map(rec => {
                    const st = RECORDING_STATUS[rec.status] || RECORDING_STATUS.completed;
                    const supplierName = suppliers.find(s => s.id === rec.supplier_id)?.display_name || rec.supplier_key;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{supplierName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(rec.recorded_at)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {rec.model || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{rec.steps_count}</td>
                        <td className="px-4 py-3 font-medium text-emerald-600 text-sm">{fmtPrice(rec.final_price)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                            {st.pulse && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />}
                            {rec.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {rec.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {rec.status === 'analyzing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                          {fmtDuration(rec.duration_seconds)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Szczegóły
                            </button>
                            {(rec.status === 'completed' || rec.status === 'failed') && (
                              <button
                                onClick={() => handleAnalyzeRecording(rec)}
                                className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Brain className="w-3 h-3" /> Analizuj AI
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecordings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm font-medium">Brak nagrań</p>
                        <p className="text-slate-400 text-xs mt-1">Rozpocznij nagrywanie w zakładce Dostawcy</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* KNOWLEDGE GRAPH TAB                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'knowledge' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-slate-800">
              Graf wiedzy {selectedSupplierName ? `dla ${selectedSupplierName}` : ''}
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={knowledgeSupplier}
                onChange={e => setKnowledgeSupplier(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Wybierz dostawcę</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </select>
              <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Odśwież">
                <RefreshCw className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <p className="text-xs font-bold uppercase opacity-70">Węzły</p>
              <p className="text-2xl font-black mt-1">{filteredNodes.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <p className="text-xs font-bold uppercase opacity-70">Krawędzie</p>
              <p className="text-2xl font-black mt-1">{filteredEdges.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
              <p className="text-xs font-bold uppercase opacity-70">Reguły</p>
              <p className="text-2xl font-black mt-1">{filteredEdges.filter(e => e.condition).length}</p>
            </div>
          </div>

          {/* Placeholder */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
            <p className="text-xs text-indigo-700">
              <strong>ℹ️ Info:</strong> Wizualizacja grafu zostanie dodana w Fazie 2. Poniżej dane w formie tabelarycznej.
            </p>
          </div>

          {/* Nodes Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Węzły grafu ({filteredNodes.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Key</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Nazwa</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Typ</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Wymagany</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Opcje</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Widziany</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNodes.slice(0, 50).map(node => (
                    <tr key={node.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{node.key}</td>
                      <td className="px-4 py-2 font-medium text-slate-800 text-xs">{node.name}</td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{node.node_type}</span>
                      </td>
                      <td className="px-4 py-2">
                        {node.required ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{node.options_count}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{node.seen_count}×</td>
                    </tr>
                  ))}
                  {filteredNodes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                        {knowledgeSupplier ? 'Brak węzłów dla tego dostawcy' : 'Wybierz dostawcę aby zobaczyć graf wiedzy'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edges Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" /> Krawędzie grafu ({filteredEdges.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Z → Do</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Typ</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Warunek</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEdges.slice(0, 50).map(edge => (
                    <tr key={edge.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-blue-600">{edge.from_node}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400 inline mx-1" />
                        <span className="font-mono text-xs text-purple-600">{edge.to_node}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{edge.edge_type}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">
                        {edge.condition || '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                edge.confidence >= 0.9 ? 'bg-emerald-500' :
                                edge.confidence >= 0.7 ? 'bg-blue-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(edge.confidence * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{Math.round(edge.confidence * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEdges.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">
                        {knowledgeSupplier ? 'Brak krawędzi dla tego dostawcy' : 'Wybierz dostawcę aby zobaczyć graf wiedzy'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TESTS TAB                                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-slate-800">Wyniki testów</h2>
            <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Odśwież">
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Placeholder */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <p className="text-xs text-amber-700">
              <strong>🚧 W budowie:</strong> Testy automatyczne zostaną dodane w Fazie 3. Poniżej wyniki dotychczasowych testów.
            </p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Konfiguracja</th>
                    <th className="px-4 py-3">Nasza cena</th>
                    <th className="px-4 py-3">Cena dostawcy</th>
                    <th className="px-4 py-3">Różnica</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Czas</th>
                    <th className="px-4 py-3">Data testu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testResults.map(test => {
                    const supplierName = suppliers.find(s => s.id === test.supplier_id)?.display_name || '—';
                    return (
                      <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800 text-xs">{test.config_summary}</p>
                            <p className="text-[10px] text-slate-400">{supplierName}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-sm text-slate-700">{fmtPrice(test.our_price)}</td>
                        <td className="px-4 py-3 font-medium text-sm text-slate-700">{fmtPrice(test.supplier_price)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${
                            Math.abs(test.price_diff_pct) <= 2 ? 'text-emerald-600' :
                            Math.abs(test.price_diff_pct) <= 5 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {test.price_diff_pct > 0 ? '+' : ''}{test.price_diff_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {test.status === 'pass' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" /> Zaliczony
                            </span>
                          )}
                          {test.status === 'fail' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3 mr-1" /> Niezaliczony
                            </span>
                          )}
                          {test.status === 'error' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              <AlertCircle className="w-3 h-3 mr-1" /> Błąd
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                          {test.duration_ms ? `${(test.duration_ms / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(test.tested_at)}</td>
                      </tr>
                    );
                  })}
                  {testResults.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <TestTube className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm font-medium">Brak wyników testów</p>
                        <p className="text-slate-400 text-xs mt-1">Uruchom testy z zakładki Dostawcy</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ADD / EDIT SUPPLIER MODAL                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingSupplier ? '✏️ Edytuj dostawcę' : '➕ Dodaj dostawcę'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingSupplier ? 'Zaktualizuj dane konfiguratora dostawcy' : 'Dodaj nowy konfigurator dostawcy do systemu'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Supplier Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Klucz dostawcy <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.supplier_key}
                  onChange={e => setFormData(prev => ({ ...prev, supplier_key: e.target.value }))}
                  placeholder="np. heroal, warema, solarlux"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  disabled={!!editingSupplier}
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Nazwa wyświetlana <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="np. Heroal Konfigurator"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  URL konfiguratora <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formData.configurator_url}
                    onChange={e => setFormData(prev => ({ ...prev, configurator_url: e.target.value }))}
                    placeholder="https://konfigurator.heroal.de"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Login required */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <input
                  type="checkbox"
                  id="login_required"
                  checked={formData.login_required}
                  onChange={e => setFormData(prev => ({ ...prev, login_required: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="login_required" className="text-sm text-slate-700 font-medium cursor-pointer flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Wymaga logowania
                </label>
              </div>

              {/* Login fields (conditional) */}
              {formData.login_required && (
                <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL logowania</label>
                    <input
                      type="url"
                      value={formData.login_url}
                      onChange={e => setFormData(prev => ({ ...prev, login_url: e.target.value }))}
                      placeholder="https://konfigurator.heroal.de/login"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nazwa użytkownika</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hasło</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSubmitSupplier}
                disabled={submitting}
                className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {editingSupplier ? 'Zapisz zmiany' : 'Dodaj dostawcę'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguratorTrainerPage;
