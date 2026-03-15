import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FacebookService, type FBPost, type FBTemplate, type FBCampaign } from '../../services/database/facebook.service';
import toast from 'react-hot-toast';
import { AIAssistantTab, ContactsTab } from './FacebookAIContacts';
import CampaignsTab from './FacebookCampaignsTab';
import ContentHubTab from './FacebookContentHub';
import EnhancedDashboard from './FacebookEnhancedDashboard';
import MessengerPanel from './FacebookMessengerPanel';

// ═══════════════════════════════════════════
// FACEBOOK ADS MANAGER — Consolidated 5-Tab
// ═══════════════════════════════════════════

type TabId = 'dashboard' | 'content' | 'campaigns' | 'ai' | 'contacts' | 'messenger';
const VALID_TABS: TabId[] = ['dashboard', 'content', 'campaigns', 'ai', 'contacts', 'messenger'];

export default function FacebookAdsPage() {
    const [searchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab') as TabId | null;
    const [activeTab, setActiveTab] = useState<TabId>(tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard');
    const [connected, setConnected] = useState<boolean | null>(null);
    const [pageInfo, setPageInfo] = useState<any>(null);
    const [adAccountInfo, setAdAccountInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

    useEffect(() => { checkConnection(); }, []);

    const checkConnection = async () => {
        try {
            setLoading(true);
            const result = await FacebookService.verifyConnection();
            setConnected(result.connected);
            setPageInfo(result.page);
            setAdAccountInfo(result.adAccount);
        } catch (err: any) {
            setConnected(false);
            toast.error('Brak połączenia z Facebook: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const tabs: { id: TabId; label: string; icon: string; desc: string }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'KPIs, analityka, budżet' },
        { id: 'content', label: 'Treści', icon: '📝', desc: 'Posty, kalendarz, kreacje' },
        { id: 'campaigns', label: 'Kampanie', icon: '🎯', desc: 'Reklamy i odbiorcy' },
        { id: 'ai', label: 'AI Studio', icon: '🤖', desc: 'AI, konkurencja, toolbox' },
        { id: 'contacts', label: 'Kontakty', icon: '📋', desc: 'Pipeline kontaktów' },
        { id: 'messenger', label: 'Messenger', icon: '💬', desc: 'AI Chatbot' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
                        <span className="text-3xl">📘</span>
                    </div>
                    <p className="text-slate-500 font-medium">Łączenie z Facebook API...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-60" />
                <div className="relative p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {pageInfo?.picture?.data?.url ? (
                                <img src={pageInfo.picture.data.url} alt="" className="w-14 h-14 rounded-xl border-2 border-white/30 shadow-lg" />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <span className="text-3xl">📘</span>
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-white">Facebook Ads Manager</h1>
                                <p className="text-blue-100 text-sm">Profesjonalne zarządzanie reklamami • Polendach24</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {connected ? (
                                <div className="flex items-center gap-4">
                                    {pageInfo?.fan_count && (
                                        <div className="text-right hidden md:block">
                                            <p className="text-2xl font-bold text-white">{pageInfo.fan_count.toLocaleString()}</p>
                                            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Polubień</p>
                                        </div>
                                    )}
                                    {pageInfo?.followers_count && (
                                        <div className="text-right hidden md:block">
                                            <p className="text-2xl font-bold text-white">{pageInfo.followers_count.toLocaleString()}</p>
                                            <p className="text-[10px] text-blue-200 uppercase tracking-wider">Obserwujących</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-lg backdrop-blur border border-green-400/30">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-sm font-medium text-white">API Live</span>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={checkConnection}
                                    className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-400/30 hover:bg-red-500/30 transition-colors"
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-sm text-white">Połącz ponownie</span>
                                </button>
                            )}
                            <button
                                onClick={async () => {
                                    try {
                                        toast.loading('Odświeżam token...', { id: 'token-refresh' });
                                        const result = await FacebookService.refreshToken();
                                        if (result.success) {
                                            toast.success(`Token przedłużony na ${result.expires_in_days} dni! (do ${new Date(result.expires_at).toLocaleDateString('de-DE')})`, { id: 'token-refresh', duration: 6000 });
                                            checkConnection();
                                        } else {
                                            toast.error('Błąd: ' + JSON.stringify(result), { id: 'token-refresh' });
                                        }
                                    } catch (err: any) {
                                        toast.error('Błąd odświeżania: ' + err.message, { id: 'token-refresh' });
                                    }
                                }}
                                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-lg border border-white/20 transition-all backdrop-blur"
                            >
                                🔄 Odśwież Token
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation — 5 Consolidated Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                <div className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            <div className="text-left hidden md:block">
                                <p className="leading-none">{tab.label}</p>
                                <p className={`text-[10px] font-normal ${activeTab === tab.id ? 'text-blue-200' : 'text-slate-400'}`}>{tab.desc}</p>
                            </div>
                            <span className="md:hidden">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && <EnhancedDashboard pageInfo={pageInfo} adAccountInfo={adAccountInfo} />}
            {activeTab === 'content' && <ContentHubTab />}
            {activeTab === 'campaigns' && <CampaignsTab />}
            {activeTab === 'ai' && <AIAssistantTab />}
            {activeTab === 'contacts' && <ContactsTab />}
            {activeTab === 'messenger' && <MessengerPanel />}
        </div>
    );
}

// ═══════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════

function DashboardTab({ pageInfo, adAccountInfo }: { pageInfo: any; adAccountInfo: any }) {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [apiErrors, setApiErrors] = useState<string[]>([]);

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        setLoading(true);
        setApiErrors([]);
        try {
            const data = await FacebookService.getAccountInsights();
            setInsights(data);
            if (data?.errors) setApiErrors(data.errors);
        } catch (err: any) {
            console.error('Failed to load insights:', err);
            setApiErrors([err.message || 'Nie udało się połączyć z Facebook API']);
        } finally {
            setLoading(false);
        }
    };

    const parseInsight = (insightData: any, field: string) => {
        if (!insightData?.data?.[0]) return 0;
        return Number(insightData.data[0][field] || 0);
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);

    const monthlyData = insights?.monthly?.data?.[0] || {};
    const weeklyData = insights?.weekly?.data?.[0] || {};

    const kpis = [
        { label: 'Wydatki (30d)', value: formatCurrency(Number(monthlyData.spend || 0)), icon: '💰', color: 'from-emerald-500 to-teal-600' },
        { label: 'Zasięg (30d)', value: Number(monthlyData.reach || 0).toLocaleString(), icon: '👁️', color: 'from-blue-500 to-cyan-600' },
        { label: 'Kliknięcia (30d)', value: Number(monthlyData.clicks || 0).toLocaleString(), icon: '🖱️', color: 'from-violet-500 to-purple-600' },
        { label: 'CTR', value: `${Number(monthlyData.ctr || 0).toFixed(2)}%`, icon: '📊', color: 'from-amber-500 to-orange-600' },
        { label: 'CPC', value: formatCurrency(Number(monthlyData.cpc || 0)), icon: '💳', color: 'from-rose-500 to-pink-600' },
        { label: 'Wyświetlenia (30d)', value: Number(monthlyData.impressions || 0).toLocaleString(), icon: '📺', color: 'from-indigo-500 to-blue-600' },
    ];

    return (
        <div className="space-y-6">
            {/* API Errors Banner */}
            {apiErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold text-amber-800">⚠️ Problemy z połączeniem Facebook API</p>
                            {apiErrors.map((e, i) => <p key={i} className="text-xs text-amber-700 mt-1">• {e}</p>)}
                            <p className="text-[10px] text-amber-600 mt-2">Sprawdź token dostępu lub uprawnienia aplikacji w Meta Business Suite.</p>
                        </div>
                        <button onClick={loadInsights} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 whitespace-nowrap ml-3">
                            🔄 Ponownie
                        </button>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
                            <span className="text-lg">{kpi.icon}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                        <p className="text-lg font-bold text-slate-800 mt-0.5">
                            {loading ? <span className="animate-pulse">---</span> : kpi.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Page & Account Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Page Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">📘</span>
                        Strona Facebook
                    </h3>
                    {pageInfo && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                {pageInfo.picture?.data?.url && (
                                    <img src={pageInfo.picture.data.url} alt="" className="w-12 h-12 rounded-lg" />
                                )}
                                <div>
                                    <p className="font-bold text-slate-800">{pageInfo.name}</p>
                                    <p className="text-xs text-slate-500">{pageInfo.category}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-blue-50 rounded-lg px-3 py-2">
                                    <p className="text-slate-500 text-xs">Polubienia</p>
                                    <p className="font-bold text-blue-700">{(pageInfo.fan_count || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-indigo-50 rounded-lg px-3 py-2">
                                    <p className="text-slate-500 text-xs">Obserwujący</p>
                                    <p className="font-bold text-indigo-700">{(pageInfo.followers_count || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ad Account Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">💎</span>
                        Konto reklamowe
                    </h3>
                    {adAccountInfo && (
                        <div className="space-y-3">
                            <p className="font-bold text-slate-800">{adAccountInfo.name || adAccountInfo.business_name || 'Konto reklamowe'}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-green-50 rounded-lg px-3 py-2">
                                    <p className="text-slate-500 text-xs">Status</p>
                                    <p className="font-bold text-green-700">{adAccountInfo.account_status === 1 ? '✅ Aktywne' : '⚠️ Nieaktywne'}</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg px-3 py-2">
                                    <p className="text-slate-500 text-xs">Wydano łącznie</p>
                                    <p className="font-bold text-orange-700">{formatCurrency(Number(adAccountInfo.amount_spent || 0) / 100)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly comparison */}
            {weeklyData.spend && (
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">📅 Ostatnie 7 dni</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(Number(weeklyData.spend || 0))}</p>
                            <p className="text-xs text-slate-500">Wydano</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-indigo-600">{Number(weeklyData.impressions || 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Wyświetlenia</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{Number(weeklyData.clicks || 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Kliknięcia</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-teal-600">{Number(weeklyData.reach || 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Zasięg</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Forms Section */}
            <LeadFormsSection />

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs">⚡</span>
                    Szybkie akcje
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Nowy post', icon: '📝', color: 'from-blue-500 to-blue-600' },
                        { label: 'AI Copywriter', icon: '🤖', color: 'from-purple-500 to-purple-600' },
                        { label: 'Nowa kampania', icon: '🎯', color: 'from-emerald-500 to-emerald-600' },
                        { label: 'Sprawdź konkurencję', icon: '🏆', color: 'from-amber-500 to-amber-600' },
                    ].map((action, i) => (
                        <button key={i} className={`bg-gradient-to-r ${action.color} rounded-lg px-4 py-3 text-left hover:brightness-110 transition-all`}>
                            <span className="text-lg">{action.icon}</span>
                            <p className="text-xs font-semibold mt-1">{action.label}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Lead Forms Section ───
function LeadFormsSection() {
    const [forms, setForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedForm, setExpandedForm] = useState<string | null>(null);
    const [leads, setLeads] = useState<Record<string, any[]>>({});
    const [loadingLeads, setLoadingLeads] = useState<string | null>(null);

    useEffect(() => {
        FacebookService.getLeadForms()
            .then(data => setForms(data.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const fetchLeads = async (formId: string) => {
        if (expandedForm === formId) { setExpandedForm(null); return; }
        setExpandedForm(formId);
        if (leads[formId]) return;
        setLoadingLeads(formId);
        try {
            const data = await FacebookService.getLeads(formId, 10);
            setLeads(prev => ({ ...prev, [formId]: data.data || [] }));
        } catch (err: any) {
            toast.error('Błąd: ' + err.message);
        } finally { setLoadingLeads(null); }
    };

    if (loading) return null;
    if (forms.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">📋</span>
                Formularze leadów ({forms.length})
            </h3>
            <div className="space-y-2">
                {forms.map((form: any) => (
                    <div key={form.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => fetchLeads(form.id)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${form.status === 'ACTIVE' ? 'bg-green-400' : 'bg-slate-300'}`} />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">{form.name}</p>
                                    <p className="text-[10px] text-slate-400">
                                        {form.leads_count || 0} leadów • {new Date(form.created_time).toLocaleDateString('pl-PL')}
                                    </p>
                                </div>
                            </div>
                            <span className="text-slate-400 text-xs">{expandedForm === form.id ? '▲' : '▼'}</span>
                        </button>
                        {expandedForm === form.id && (
                            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                                {loadingLeads === form.id ? (
                                    <p className="text-xs text-slate-400">Ładuję leady...</p>
                                ) : (leads[form.id] || []).length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Brak leadów w tym formularzu</p>
                                ) : (
                                    <div className="space-y-2">
                                        {(leads[form.id] || []).map((lead: any) => (
                                            <div key={lead.id} className="bg-white rounded-lg p-3 border border-slate-200 text-xs">
                                                <p className="text-slate-400 text-[10px] mb-1">
                                                    {new Date(lead.created_time).toLocaleString('pl-PL')}
                                                </p>
                                                {(lead.field_data || []).map((f: any, fi: number) => (
                                                    <p key={fi} className="text-slate-600">
                                                        <span className="font-medium text-slate-500">{f.name}:</span> {f.values?.join(', ')}
                                                    </p>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// POSTS TAB — Post Publisher + AI Creator
// ═══════════════════════════════════════════

function PostsTab() {
    const [fbPosts, setFbPosts] = useState<any[]>([]);
    const [templates, setTemplates] = useState<FBTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showCreator, setShowCreator] = useState(false);
    const [newPost, setNewPost] = useState({ content: '', media_url: '', scheduled_at: '' });
    const [publishing, setPublishing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [imageFormat, setImageFormat] = useState<'post' | 'square' | 'story'>('post');
    const [quickTopic, setQuickTopic] = useState('');

    const FB_SIZES = {
        post: { w: 1200, h: 630, label: 'Post (1200×630)', desc: 'Idealny do linków i udostępnień' },
        square: { w: 1080, h: 1080, label: 'Kwadrat (1080×1080)', desc: 'Najlepszy engagement' },
        story: { w: 1080, h: 1920, label: 'Story (1080×1920)', desc: 'Reels / Stories' },
    };

    const resizeImage = (file: File, targetW: number, targetH: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d')!;
                // Cover: fill entire target, crop center
                const scale = Math.max(targetW / img.width, targetH / img.height);
                const sw = targetW / scale;
                const sh = targetH / scale;
                const sx = (img.width - sw) / 2;
                const sy = (img.height - sh) / 2;
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas error')), 'image/jpeg', 0.92);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const size = FB_SIZES[imageFormat];
            const resized = await resizeImage(file, size.w, size.h);
            // Upload to Supabase Storage
            const fileName = `fb-posts/${Date.now()}-${size.w}x${size.h}.jpg`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, resized, { contentType: 'image/jpeg', upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
            setNewPost(prev => ({ ...prev, media_url: urlData.publicUrl }));
            setImagePreview(urlData.publicUrl);
            toast.success(`✅ Zdjęcie przeskalowane do ${size.w}×${size.h} i przesłane!`);
        } catch (err: any) { toast.error('Upload error: ' + err.message); }
        finally { setUploadingImage(false); }
    };

    const handleQuickAI = async (topic: string) => {
        setGenerating(true);
        try {
            const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
                body: {
                    analysisType: 'fb_post_generator',
                    businessData: `Thema für den Post: ${topic}`,
                }
            });
            if (error) throw error;
            const content = (data.content || data.analysis || '').trim();
            // The fb_post_generator prompt outputs ONLY clean post text
            // Remove any markdown headers/formatting artifacts if they snuck in
            const cleaned = content
                .replace(/^#+\s.*$/gm, '')  // Remove markdown headers
                .replace(/^---.*$/gm, '')   // Remove horizontal rules
                .replace(/^\*.*Powered by Claude\*$/gm, '') // Remove footer
                .replace(/^\[.*\]$/gm, '')  // Remove [placeholder] lines
                .trim();
            setNewPost(prev => ({ ...prev, content: cleaned || content }));
            toast.success('🤖 Post wygenerowany przez AI Copywriter!');
        } catch (err: any) { toast.error('AI Error: ' + err.message); }
        finally { setGenerating(false); }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [posts, tmpls] = await Promise.all([
                FacebookService.getFBPosts(),
                FacebookService.getTemplates().catch(() => []),
            ]);
            setFbPosts(posts.data || []);
            setTemplates(tmpls);
        } catch (err: any) {
            console.error('Failed to load posts:', err);
            setLoadError(err.message || 'Nie udało się załadować postów z Facebook');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!newPost.content.trim()) return toast.error('Wpisz treść posta');
        setPublishing(true);
        try {
            const params: any = { message: newPost.content };
            if (newPost.media_url) params.media_url = newPost.media_url;
            if (newPost.scheduled_at) params.scheduled_time = newPost.scheduled_at;

            await FacebookService.publishPost(params);

            // Save locally
            await FacebookService.saveLocalPost({
                content: newPost.content,
                media_urls: newPost.media_url ? [newPost.media_url] : [],
                post_type: newPost.media_url ? 'photo' : 'text',
                status: newPost.scheduled_at ? 'scheduled' : 'published',
                scheduled_at: newPost.scheduled_at || null,
                published_at: newPost.scheduled_at ? null : new Date().toISOString(),
            });

            toast.success(newPost.scheduled_at ? '⏰ Post zaplanowany!' : '✅ Post opublikowany!');
            setNewPost({ content: '', media_url: '', scheduled_at: '' });
            setShowCreator(false);
            loadData();
        } catch (err: any) {
            toast.error('Błąd: ' + err.message);
        } finally {
            setPublishing(false);
        }
    };

    const handleAIGenerate = async () => {
        setGenerating(true);
        try {
            const template = templates.find(t => t.id === selectedTemplate);
            const templateName = template?.name || 'Allgemeiner Post';
            const category = template?.category || 'general';
            
            // Build context from template name + variables
            let context = `Post-Typ: ${templateName}\nKategorie: ${category}`;
            if (Object.keys(templateVars).length > 0) {
                const varsStr = Object.entries(templateVars)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');
                if (varsStr) context += `\nDetails: ${varsStr}`;
            }

            const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
                body: {
                    analysisType: 'fb_post_generator',
                    businessData: context,
                }
            });
            if (error) throw error;
            const content = (data.content || data.analysis || '').trim();
            const cleaned = content
                .replace(/^#+\s.*$/gm, '')
                .replace(/^---.*$/gm, '')
                .replace(/^\*.*Powered by Claude\*$/gm, '')
                .replace(/^\[.*\]$/gm, '')
                .trim();
            setNewPost(prev => ({ ...prev, content: cleaned || content }));
            toast.success('🤖 Post wygenerowany przez AI Copywriter!');
        } catch (err: any) {
            toast.error('Błąd AI: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const categoryIcons: Record<string, string> = {
        realization: '🏗️', seasonal: '🌞', educational: '📚', testimonial: '⭐', promotion: '🔥', general: '📝'
    };

    return (
        <div className="space-y-6">
            {/* Action bar */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">📝 Posty na stronie</h2>
                <button
                    onClick={() => setShowCreator(!showCreator)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <span>✏️</span>
                    <span>{showCreator ? 'Zamknij kreator' : 'Nowy post'}</span>
                </button>
            </div>

            {/* Post Creator */}
            {showCreator && (
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm">✨</span>
                        Kreator posta z AI
                    </h3>

                    {/* AI Template selector */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 space-y-3">
                        <p className="text-xs font-bold text-indigo-700">🤖 Generator AI — wybierz szablon</p>
                        <div className="flex flex-wrap gap-2">
                            {templates.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedTemplate(t.id);
                                        setTemplateVars({});
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        selectedTemplate === t.id
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    {categoryIcons[t.category] || '📝'} {t.name}
                                </button>
                            ))}
                        </div>

                        {/* Template variables */}
                        {selectedTemplate && (() => {
                            const tmpl = templates.find(t => t.id === selectedTemplate);
                            if (!tmpl?.variables?.length) return null;
                            return (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {tmpl.variables.map(v => (
                                        <input
                                            key={v}
                                            placeholder={v}
                                            value={templateVars[v] || ''}
                                            onChange={e => setTemplateVars(prev => ({ ...prev, [v]: e.target.value }))}
                                            className="px-3 py-1.5 rounded-lg border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                        />
                                    ))}
                                </div>
                            );
                        })()}

                        <button
                            onClick={handleAIGenerate}
                            disabled={generating}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Generuję...
                                </>
                            ) : (
                                <>🤖 Generuj treść AI</>
                            )}
                        </button>
                    </div>

                    {/* Content editor */}
                    <textarea
                        value={newPost.content}
                        onChange={e => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Napisz treść posta lub użyj AI aby wygenerować..."
                        rows={6}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-400 focus:outline-none resize-y text-sm"
                    />

                    {/* Image Upload with Auto-Resize */}
                    <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-lg p-4 space-y-3">
                        <p className="text-xs font-bold text-emerald-700">🖼️ Zdjęcie — automatyczne skalowanie do rozmiaru FB</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(Object.entries(FB_SIZES) as [string, typeof FB_SIZES.post][]).map(([key, size]) => (
                                <button key={key} onClick={() => setImageFormat(key as any)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                        imageFormat === key ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                                    }`}>
                                    <span className="block font-bold">{size.label}</span>
                                    <span className="block text-[9px] opacity-70">{size.desc}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex-1 cursor-pointer">
                                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                                    uploadingImage ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                                }`}>
                                    {uploadingImage ? (
                                        <p className="text-sm text-emerald-600 font-medium">⏳ Skaluję i przesyłam...</p>
                                    ) : imagePreview ? (
                                        <div className="space-y-2">
                                            <img src={imagePreview} alt="" className="max-h-24 mx-auto rounded-lg" />
                                            <p className="text-[10px] text-slate-400">✅ {FB_SIZES[imageFormat].w}×{FB_SIZES[imageFormat].h}px — kliknij aby zmienić</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-slate-500">📷 Kliknij aby wybrać zdjęcie</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Auto-resize do {FB_SIZES[imageFormat].w}×{FB_SIZES[imageFormat].h}px</p>
                                        </div>
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Quick AI Topics */}
                    <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-lg p-4 space-y-3">
                        <p className="text-xs font-bold text-violet-700">⚡ Szybka generacja AI — kliknij temat:</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { icon: '🏗️', label: 'Realizacja', topic: 'Nowa realizacja terrassenüberdachung — showcase z przed/po' },
                                { icon: '🌸', label: 'Wiosna', topic: 'Wiosenna kampania — czas na planowanie zadaszeń na lato' },
                                { icon: '⭐', label: 'Opinia', topic: 'Opinia zadowolonego klienta — 5-gwiazdkowa recenzja' },
                                { icon: '📚', label: 'Tipp', topic: 'Ekspercki tip — aluminium vs drewno, wartości i zalety' },
                                { icon: '❓', label: 'Pytanie', topic: 'Angażujące pytanie do community o preferencje zadaszeń' },
                                { icon: '🔥', label: 'Promocja', topic: 'Specjalna oferta wiosenna — rabat lub darmowa konsultacja' },
                                { icon: '🔧', label: 'Za kulisami', topic: 'Za kulisami — nasz zespół podczas montażu' },
                                { icon: '💡', label: 'Inspiracja', topic: 'Inspiracja — piękne tarasy z zadaszeniami na lato' },
                            ].map(q => (
                                <button key={q.label} onClick={() => handleQuickAI(q.topic)} disabled={generating}
                                    className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-medium hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50">
                                    {q.icon} {q.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={quickTopic} onChange={e => setQuickTopic(e.target.value)} placeholder="Lub wpisz własny temat..."
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                            <button onClick={() => quickTopic && handleQuickAI(quickTopic)} disabled={generating || !quickTopic}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                                {generating ? '⏳' : '🤖'} Generuj
                            </button>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">⏰ Zaplanuj (opcjonalnie)</label>
                        <input
                            type="datetime-local"
                            value={newPost.scheduled_at}
                            onChange={e => setNewPost(prev => ({ ...prev, scheduled_at: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                    </div>

                    {/* Preview */}
                    {newPost.content && (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-xs font-bold text-slate-500 mb-2">👁️ Podgląd posta:</p>
                            <div className="bg-white rounded-lg p-4 shadow-sm border">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">P</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Polendach24</p>
                                        <p className="text-[10px] text-slate-400">{newPost.scheduled_at ? 'Zaplanowano' : 'Teraz'}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{newPost.content}</p>
                                {(imagePreview || newPost.media_url) && (
                                    <img src={imagePreview || newPost.media_url} alt="" className="mt-3 rounded-lg w-full max-h-48 object-cover" />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Publish buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePublish}
                            disabled={publishing || !newPost.content.trim()}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {publishing ? 'Publikuję...' : newPost.scheduled_at ? '⏰ Zaplanuj post' : '🚀 Opublikuj teraz'}
                        </button>
                        <button
                            onClick={() => {
                                FacebookService.saveLocalPost({
                                    content: newPost.content,
                                    media_urls: newPost.media_url ? [newPost.media_url] : [],
                                    post_type: newPost.media_url ? 'photo' : 'text',
                                    status: 'draft',
                                });
                                toast.success('📝 Zapisano jako szkic');
                            }}
                            className="px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
                        >
                            💾 Zapisz szkic
                        </button>
                    </div>
                </div>
            )}

            {/* Posts list from Facebook */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 text-sm">Ładuję posty z Facebook...</p>
                    </div>
                ) : loadError ? (
                    <div className="bg-red-50 border border-red-300 rounded-xl p-6 text-center">
                        <p className="text-2xl mb-2">⚠️</p>
                        <p className="text-sm font-bold text-red-800">Nie udało się załadować postów z Facebook</p>
                        <p className="text-xs text-red-600 mt-1">{loadError}</p>
                        <button onClick={loadData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">🔄 Spróbuj ponownie</button>
                    </div>
                ) : fbPosts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <p className="text-4xl mb-3">📝</p>
                        <p className="text-slate-500 font-medium">Brak postów</p>
                        <p className="text-xs text-slate-400 mt-1">Kliknij "Nowy post" aby utwórzyć pierwszy</p>
                    </div>
                ) : (
                    fbPosts.map((post: any, i: number) => {
                        const likes = post.likes?.summary?.total_count || 0;
                        const comments = post.comments?.summary?.total_count || 0;
                        const shares = post.shares?.count || 0;

                        return (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        {post.full_picture && (
                                            <img src={post.full_picture} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 line-clamp-3 leading-relaxed">{post.message || '(brak tekstu)'}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                                📅 {new Date(post.created_time).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {/* Engagement metrics bar */}
                                <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border-t border-slate-100 rounded-b-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="flex items-center gap-1 text-slate-500">
                                            <span className="text-red-500">❤️</span> {likes}
                                        </span>
                                        <span className="flex items-center gap-1 text-slate-500">
                                            <span className="text-blue-500">💬</span> {comments}
                                        </span>
                                        {shares > 0 && (
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <span className="text-green-500">🔁</span> {shares}
                                            </span>
                                        )}
                                    </div>
                                    {post.permalink_url && (
                                        <a href={post.permalink_url} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                            Otwórz na FB →
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// CampaignsTab — imported from ./FacebookCampaignsTab.tsx



// ═══════════════════════════════════════════
// AUDIENCES TAB
// ═══════════════════════════════════════════

function AudiencesTab() {
    const [audiences, setAudiences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreator, setShowCreator] = useState(false);
    const [newAudience, setNewAudience] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);

    const loadAudiences = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await FacebookService.getAudiences();
            setAudiences(data.data || []);
        } catch (err: any) {
            setError(err.message || 'Nie udało się załadować grup');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadAudiences(); }, []);

    const handleCreate = async () => {
        if (!newAudience.name.trim()) return toast.error('Podaj nazwę grupy');
        setCreating(true);
        try {
            await FacebookService.createAudience(newAudience);
            toast.success('✅ Grupa odbiorców utworzona!');
            setNewAudience({ name: '', description: '' });
            setShowCreator(false);
            loadAudiences();
        } catch (err: any) { toast.error('Błąd: ' + err.message); }
        finally { setCreating(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">👥 Grupy odbiorców</h2>
                <div className="flex gap-2">
                    <button onClick={loadAudiences} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200">🔄 Odśwież</button>
                    <button onClick={() => setShowCreator(!showCreator)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm">
                        ➕ Nowa grupa
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-bold text-red-800">❌ Błąd ładowania grup</p>
                        <p className="text-xs text-red-700 mt-1">{error}</p>
                    </div>
                    <button onClick={loadAudiences} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 ml-3">🔄 Ponów</button>
                </div>
            )}

            {/* Audience creator */}
            {showCreator && (
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 space-y-4">
                    <h3 className="font-bold text-slate-800">🆕 Nowa grupa odbiorców</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Nazwa grupy</label>
                            <input value={newAudience.name} onChange={e => setNewAudience(p => ({ ...p, name: e.target.value }))}
                                placeholder="np. Klienci 2025" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Opis (opcjonalnie)</label>
                            <input value={newAudience.description} onChange={e => setNewAudience(p => ({ ...p, description: e.target.value }))}
                                placeholder="np. Klienci z CRM" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                        </div>
                    </div>
                    <button onClick={handleCreate} disabled={creating} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                        {creating ? 'Tworzę...' : '🚀 Utwórz grupę'}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-slate-400">Ładuję...</div>
            ) : audiences.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="text-slate-500 font-medium">Brak grup odbiorców</p>
                    <p className="text-xs text-slate-400 mt-1">Utwórz Custom Audience z danych CRM lub kliknij "Nowa grupa"</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {audiences.map((a: any, i: number) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-slate-800">{a.name}</h4>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{a.subtype}</span>
                            </div>
                            <p className="text-sm text-slate-500">~{(a.approximate_count || 0).toLocaleString()} osób</p>
                            {a.delivery_status && <p className="text-[10px] text-slate-400 mt-1">Status: {JSON.stringify(a.delivery_status)}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════

function AnalyticsTab() {
    const [insights, setInsights] = useState<any>(null);
    const [pageInsights, setPageInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);
    const [period, setPeriod] = useState<'week' | 'days_28' | 'month'>('week');

    const loadAnalytics = async (p?: string) => {
        setLoading(true);
        setErrors([]);
        const errs: string[] = [];
        const selectedPeriod = p || period;
        const [acc, page] = await Promise.all([
            FacebookService.getAccountInsights().catch((e: any) => { errs.push(`Konto reklamowe: ${e.message}`); return null; }),
            FacebookService.getPageInsights(selectedPeriod).catch((e: any) => { errs.push(`Statystyki strony: ${e.message}`); return null; }),
        ]);
        setInsights(acc);
        setPageInsights(page);
        if (acc?.errors) errs.push(...acc.errors);
        setErrors(errs);
        setLoading(false);
    };

    const handlePeriodChange = (p: 'week' | 'days_28' | 'month') => {
        setPeriod(p);
        loadAnalytics(p);
    };

    useEffect(() => { loadAnalytics(); }, []);

    const metricLabels: Record<string, { label: string; icon: string; color: string }> = {
        impressions: { label: 'Wyświetlenia', icon: '📺', color: 'from-blue-500 to-cyan-500' },
        reach: { label: 'Zasięg', icon: '👁️', color: 'from-indigo-500 to-blue-500' },
        clicks: { label: 'Kliknięcia', icon: '🖱️', color: 'from-violet-500 to-purple-500' },
        spend: { label: 'Wydano', icon: '💰', color: 'from-emerald-500 to-teal-500' },
        cpc: { label: 'Koszt/klik', icon: '💳', color: 'from-amber-500 to-orange-500' },
        ctr: { label: 'CTR', icon: '📊', color: 'from-rose-500 to-pink-500' },
    };

    const pageMetricNames: Record<string, string> = {
        page_impressions: 'Wyświetlenia strony',
        page_engaged_users: 'Aktywni użytkownicy',
        page_fans: 'Polubienia strony',
        page_fan_adds: 'Nowe polubienia',
        page_views_total: 'Odsłony strony',
        page_post_engagements: 'Interakcje z postami',
        page_consumptions: 'Kliknięcia w treść',
    };

    const formatMetricVal = (key: string, val: any) => {
        if (key === 'spend' || key === 'cpc') return `€${Number(val).toFixed(2)}`;
        if (key === 'ctr') return `${Number(val).toFixed(2)}%`;
        return Number(val).toLocaleString();
    };

    return (
        <div className="space-y-6">
            {/* Header with period selector */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold text-slate-800">📈 Analityka i raporty</h2>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {([
                            { value: 'week' as const, label: '7 dni' },
                            { value: 'days_28' as const, label: '28 dni' },
                            { value: 'month' as const, label: 'Miesiąc' },
                        ]).map(p => (
                            <button key={p.value} onClick={() => handlePeriodChange(p.value)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    period === p.value
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => loadAnalytics()} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                        🔄 Odśwież
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Ładuję analitykę...</p>
                </div>
            )}

            {/* API Error/Warning */}
            {!loading && errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold text-amber-800">⚠️ Częściowe dane z Facebook API</p>
                            {errors.map((e, i) => <p key={i} className="text-xs text-amber-700 mt-1">• {e}</p>)}
                        </div>
                        <button onClick={() => loadAnalytics()} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 ml-3">🔄 Ponów</button>
                    </div>
                </div>
            )}

            {!loading && (
                <>
                    {/* Ad account insights — premium KPI cards */}
                    {insights?.monthly?.data?.[0] && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center text-xs">💎</span>
                                Konto reklamowe (30 dni)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Object.entries(insights.monthly.data[0])
                                    .filter(([k]) => ['impressions', 'reach', 'clicks', 'spend', 'cpc', 'ctr'].includes(k))
                                    .map(([key, val]: any) => {
                                        const meta = metricLabels[key] || { label: key, icon: '📊', color: 'from-slate-400 to-slate-500' };
                                        return (
                                            <div key={key} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center mb-2`}>
                                                    <span className="text-white text-sm">{meta.icon}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{meta.label}</p>
                                                <p className="text-xl font-bold text-slate-800 mt-0.5">{formatMetricVal(key, val)}</p>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Weekly comparison */}
                    {insights?.weekly?.data?.[0] && (
                        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
                            <h3 className="text-sm font-bold text-indigo-700 mb-3">📅 Ostatnie 7 dni vs. 30 dni</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['spend', 'impressions', 'clicks', 'reach'].map(key => {
                                    const weekly = Number(insights.weekly.data[0]?.[key] || 0);
                                    const monthly = Number(insights.monthly?.data?.[0]?.[key] || 0);
                                    const pct = monthly > 0 ? ((weekly / monthly) * 100).toFixed(0) : '—';
                                    const meta = metricLabels[key];
                                    return (
                                        <div key={key} className="bg-white/80 rounded-lg p-3 text-center backdrop-blur">
                                            <p className="text-xs text-slate-500">{meta?.label || key}</p>
                                            <p className="text-lg font-bold text-indigo-700">{formatMetricVal(key, weekly)}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{pct}% budżetu miesięcznego</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Page insights */}
                    {pageInsights?.data && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-xs">📘</span>
                                Statystyki strony ({period === 'week' ? '7 dni' : period === 'days_28' ? '28 dni' : 'miesiąc'})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {pageInsights.data.map((metric: any, i: number) => {
                                    const label = pageMetricNames[metric.name] || metric.title || metric.name;
                                    const val = metric.values?.[0]?.value;
                                    const displayVal = val != null
                                        ? typeof val === 'object'
                                            ? Object.values(val).reduce((s: any, v: any) => s + Number(v), 0).toLocaleString()
                                            : Number(val).toLocaleString()
                                        : '—';
                                    return (
                                        <div key={i} className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-lg p-3 text-center border border-slate-100 hover:border-blue-200 transition-colors">
                                            <p className="text-xs text-slate-500 truncate">{label}</p>
                                            <p className="text-xl font-bold text-slate-700 mt-1">{displayVal}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// COMPETITORS TAB
// ═══════════════════════════════════════════

function CompetitorsTab() {
    const [searchTerm, setSearchTerm] = useState('terrassendach');

    const competitors = [
        { name: 'Weinor', pageId: '156205744432602', category: 'Hauptkonkurrent' },
        { name: 'Warema', pageId: '226aborede', category: 'Hauptkonkurrent' },
        { name: 'Solarlux', pageId: '176803292334974', category: 'Premium' },
        { name: 'Schweng Überdachungen', pageId: '', category: 'Direkt' },
        { name: 'KD Überdachung', pageId: '', category: 'Direkt' },
        { name: 'JW Company', pageId: '', category: 'Direkt' },
        { name: 'AM Pergola', pageId: '', category: 'Direkt' },
    ];

    const searchUrls = [
        { label: '🔍 Terrassenüberdachung', term: 'terrassenüberdachung' },
        { label: '🔍 Carport Aluminium', term: 'carport aluminium' },
        { label: '🔍 Pergola', term: 'pergola bioklimatisch' },
        { label: '🔍 Wintergarten', term: 'wintergarten' },
        { label: '🔍 Überdachung Montage', term: 'überdachung montage' },
    ];

    const getAdLibraryUrl = (term: string) =>
        `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=DE&q=${encodeURIComponent(term)}&search_type=keyword_unordered`;

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-5 text-white">
                <h2 className="text-xl font-bold">🏆 Monitoring Konkurencji</h2>
                <p className="text-orange-100 text-sm mt-1">Meta Ad Library — szpieguj reklamy konkurencji (publiczne, bez API)</p>
            </div>

            {/* Custom search */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs font-medium text-slate-500 mb-3">Szukaj reklam w Meta Ad Library (otwiera się w nowej karcie)</p>
                <div className="flex gap-3">
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="np. terrassendach, pergola, carport..."
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    />
                    <a href={getAdLibraryUrl(searchTerm)} target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 text-sm inline-flex items-center">
                        🔍 Szukaj w Ad Library
                    </a>
                </div>
            </div>

            {/* Quick search buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-700 mb-3">⚡ Szybkie wyszukiwania branżowe:</p>
                <div className="flex flex-wrap gap-2">
                    {searchUrls.map(s => (
                        <a key={s.term} href={getAdLibraryUrl(s.term)} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-orange-100 hover:text-orange-700 transition-colors">
                            {s.label}
                        </a>
                    ))}
                </div>
            </div>

            {/* Competitor pages */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-700 mb-3">🎯 Twoi główni konkurenci:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {competitors.map(c => (
                        <div key={c.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-orange-300 transition-colors">
                            <div>
                                <p className="font-bold text-sm text-slate-800">{c.name}</p>
                                <span className="text-[10px] text-slate-400">{c.category}</span>
                            </div>
                            <div className="flex gap-2">
                                <a href={getAdLibraryUrl(c.name)} target="_blank" rel="noopener noreferrer"
                                    className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-medium hover:bg-orange-200">
                                    📢 Reklamy
                                </a>
                                <a href={`https://www.facebook.com/search/pages/?q=${encodeURIComponent(c.name)}`} target="_blank" rel="noopener noreferrer"
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-medium hover:bg-blue-200">
                                    📘 Strona FB
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pro tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-800">💡 Pro Tip:</p>
                <p className="text-xs text-amber-700 mt-1">
                    Znajdź ciekawy post konkurenta → skopiuj jego treść → wejdź do zakładki <strong>AI Asystent → 🏆 Konkurencja</strong> → wklej treść → AI wygeneruje lepszą wersję dla Polendach24!
                </p>
            </div>
        </div>
    );
}
