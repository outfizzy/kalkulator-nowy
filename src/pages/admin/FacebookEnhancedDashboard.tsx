import React, { useEffect, useState, useMemo } from 'react';
import { FacebookService } from '../../services/database/facebook.service';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// ENHANCED DASHBOARD — Smart Analytics + AI Coach
// ═══════════════════════════════════════════

interface Props {
  pageInfo: any;
  adAccountInfo: any;
}

export default function EnhancedDashboard({ pageInfo, adAccountInfo }: Props) {
  const [insights, setInsights] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    setApiErrors([]);
    try {
      const [insightsRes, postsRes] = await Promise.allSettled([
        FacebookService.getAccountInsights(),
        FacebookService.getFBPosts(),
      ]);

      if (insightsRes.status === 'fulfilled') {
        setInsights(insightsRes.value);
        if (insightsRes.value?.errors) setApiErrors(insightsRes.value.errors);
        // Extract daily data for trend chart
        if (insightsRes.value?.daily?.data) {
          setDailyData(insightsRes.value.daily.data);
        }
      }
      if (postsRes.status === 'fulfilled') {
        setPosts((postsRes.value as any)?.data || []);
      }
    } catch (err: any) {
      setApiErrors([err.message]);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI tips based on data
  useEffect(() => {
    if (!insights && posts.length === 0) return;
    generateAiTips();
  }, [insights, posts]);

  const generateAiTips = async () => {
    setLoadingTips(true);
    try {
      const monthlyData = insights?.monthly?.data?.[0] || {};
      const weeklyData = insights?.weekly?.data?.[0] || {};

      // Local AI analysis (no API call needed)
      const tips: string[] = [];
      const ctr = Number(monthlyData.ctr || 0);
      const cpc = Number(monthlyData.cpc || 0);
      const spend = Number(monthlyData.spend || 0);
      const reach = Number(monthlyData.reach || 0);
      const clicks = Number(monthlyData.clicks || 0);
      const wSpend = Number(weeklyData.spend || 0);
      const wReach = Number(weeklyData.reach || 0);

      // CTR analysis
      if (ctr < 1) tips.push('⚠️ CTR poniżej 1% — zmień kreacje reklamowe. Spróbuj video lub karuzeli zdjęć realizacji.');
      else if (ctr > 3) tips.push('🌟 Świetne CTR powyżej 3%! Twoje kreacje działają dobrze. Rozważ zwiększenie budżetu.');
      else tips.push('👍 CTR w normie. Przetestuj A/B 2-3 warianty nagłówków, by zwiększyć.');

      // CPC analysis
      if (cpc > 2) tips.push('💰 CPC powyżej 2€ — spróbuj szerszego targetowania (Broad). Andromeda Meta lepiej optymalizuje bez ręcznych ograniczeń.');
      else if (cpc < 0.5) tips.push('🎯 CPC poniżej 0,50€ — doskonałe! Twoje kampanie są dobrze zoptymalizowane.');

      // Posting frequency
      const postCount = posts.length;
      const recentPosts = posts.filter(p => {
        const d = new Date(p.created_time);
        const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return d > week;
      });
      if (recentPosts.length < 2) tips.push('📅 Mniej niż 2 posty w tym tygodniu. Algorytm faworyzuje regularność — publikuj 3-5 razy/tydzień.');
      else if (recentPosts.length >= 5) tips.push('🔥 Świetna częstotliwość postowania! Utrzymuj ten rytm.');

      // Video content reminder
      const hasVideo = posts.some(p => p.type === 'video' || p.attachments?.data?.[0]?.type === 'video_inline');
      if (!hasVideo) tips.push('🎬 Brak treści video! Algorytm 2026 podwaja zasięg Reels/Video. Nagraj 15-sekundowy timelapse z montażu.');

      // Best posting time
      tips.push('⏰ Najlepsza godzina dla B2B w Niemczech: wtorek-środa, 9:00-10:00 CET.');

      // Budget efficiency
      if (spend > 0 && reach > 0) {
        const costPerReach = (spend / reach * 1000);
        if (costPerReach > 15) tips.push('📊 Koszt CPM (na 1000 odbiorców): ' + costPerReach.toFixed(2) + '€ — powyżej średniej. Odśwież kreacje.');
        else tips.push('✅ CPM: ' + costPerReach.toFixed(2) + '€ — dobra efektywność kosztowa.');
      }

      // Engagement analysis from posts
      if (posts.length > 0) {
        const avgEngagement = posts.reduce((sum, p) => {
          const likes = p.likes?.summary?.total_count || 0;
          const comments = p.comments?.summary?.total_count || 0;
          const shares = p.shares?.count || 0;
          return sum + likes + comments * 2 + shares * 3;
        }, 0) / posts.length;

        if (avgEngagement < 5) tips.push('💬 Niskie zaangażowanie na postach. Dodaj pytania, ankiety i CTA typu „Napisz w komentarzu".');
      }

      setAiTips(tips);
    } catch (err) {
      // Silently fail
    } finally {
      setLoadingTips(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);

  const monthlyData = insights?.monthly?.data?.[0] || {};
  const weeklyData = insights?.weekly?.data?.[0] || {};

  // Calculate period comparison
  const comparison = useMemo(() => {
    const mSpend = Number(monthlyData.spend || 0);
    const wSpend = Number(weeklyData.spend || 0);
    const mReach = Number(monthlyData.reach || 0);
    const wReach = Number(weeklyData.reach || 0);
    const mClicks = Number(monthlyData.clicks || 0);
    const wClicks = Number(weeklyData.clicks || 0);
    // Estimated weekly averages from monthly
    const avgWSpend = mSpend / 4.3;
    const avgWReach = mReach / 4.3;
    const avgWClicks = mClicks / 4.3;
    return {
      spend: avgWSpend > 0 ? ((wSpend - avgWSpend) / avgWSpend * 100) : 0,
      reach: avgWReach > 0 ? ((wReach - avgWReach) / avgWReach * 100) : 0,
      clicks: avgWClicks > 0 ? ((wClicks - avgWClicks) / avgWClicks * 100) : 0,
    };
  }, [monthlyData, weeklyData]);

  // Post scoring
  const scoredPosts = useMemo(() => {
    return posts.map(post => {
      const likes = post.likes?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shares = post.shares?.count || 0;
      // Score formula: likes + comments x3 + shares x5 (shares are most valuable for reach)
      const rawScore = likes + comments * 3 + shares * 5;
      const score = Math.min(100, Math.round(rawScore * 2));
      const hasImage = post.full_picture || post.attachments?.data?.[0]?.media;
      const isVideo = post.type === 'video' || post.attachments?.data?.[0]?.type === 'video_inline';
      return { ...post, score, likes, comments, shares, hasImage, isVideo };
    }).sort((a, b) => b.score - a.score);
  }, [posts]);

  const kpis = [
    { label: 'Wydatki (30d)', value: formatCurrency(Number(monthlyData.spend || 0)), icon: '💰', color: 'from-emerald-500 to-teal-600', trend: comparison.spend },
    { label: 'Zasięg (30d)', value: Number(monthlyData.reach || 0).toLocaleString(), icon: '👁️', color: 'from-blue-500 to-cyan-600', trend: comparison.reach },
    { label: 'Kliknięcia (30d)', value: Number(monthlyData.clicks || 0).toLocaleString(), icon: '🖱️', color: 'from-violet-500 to-purple-600', trend: comparison.clicks },
    { label: 'CTR', value: `${Number(monthlyData.ctr || 0).toFixed(2)}%`, icon: '📊', color: 'from-amber-500 to-orange-600' },
    { label: 'CPC', value: formatCurrency(Number(monthlyData.cpc || 0)), icon: '💳', color: 'from-rose-500 to-pink-600' },
    { label: 'Wyświetlenia', value: Number(monthlyData.impressions || 0).toLocaleString(), icon: '📺', color: 'from-indigo-500 to-blue-600' },
  ];

  return (
    <div className="space-y-6">
      {/* API Errors Banner */}
      {apiErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-amber-800">⚠️ Problemy z Facebook API</p>
              {apiErrors.map((e, i) => <p key={i} className="text-xs text-amber-700 mt-1">• {e}</p>)}
            </div>
            <button onClick={loadAll} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 whitespace-nowrap ml-3">
              🔄 Ponownie
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards with Trend Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {loading ? <span className="animate-pulse">---</span> : kpi.value}
            </p>
            {kpi.trend !== undefined && !loading && (
              <p className={`text-[10px] mt-1 font-semibold ${kpi.trend > 0 ? 'text-emerald-600' : kpi.trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {kpi.trend > 0 ? '▲' : kpi.trend < 0 ? '▼' : '—'} {Math.abs(kpi.trend).toFixed(0)}% vs średnia tyg.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Page & Account Info Row */}
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

      {/* Weekly comparison with trend */}
      {weeklyData.spend && (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">📅 Ostatnie 7 dni vs średnia miesięczna</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'Wydano', value: formatCurrency(Number(weeklyData.spend || 0)), trend: comparison.spend, color: 'text-blue-600' },
              { label: 'Wyświetlenia', value: Number(weeklyData.impressions || 0).toLocaleString(), color: 'text-indigo-600' },
              { label: 'Kliknięcia', value: Number(weeklyData.clicks || 0).toLocaleString(), trend: comparison.clicks, color: 'text-purple-600' },
              { label: 'Zasięg', value: Number(weeklyData.reach || 0).toLocaleString(), trend: comparison.reach, color: 'text-teal-600' },
            ].map((item, i) => (
              <div key={i}>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
                {item.trend !== undefined && (
                  <p className={`text-[10px] font-bold mt-1 ${item.trend > 0 ? 'text-emerald-600' : item.trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {item.trend > 0 ? '↑' : item.trend < 0 ? '↓' : '—'} {Math.abs(item.trend).toFixed(0)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coach + Top Posts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Engagement Coach */}
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-5">
          <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm">🧠</span>
            AI Coach — Analiza na żywo
          </h3>
          {loadingTips ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-white/60 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {aiTips.map((tip, i) => (
                <div key={i} className="bg-white/80 backdrop-blur rounded-lg px-3 py-2.5 text-sm text-slate-700 border border-white/50 shadow-sm">
                  {tip}
                </div>
              ))}
              {aiTips.length === 0 && (
                <p className="text-sm text-slate-500 italic">Brak danych do analizy. Połącz konto i poczekaj na dane.</p>
              )}
            </div>
          )}
        </div>

        {/* Top Posts Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">🏆</span>
            Top Posty — Ranking
          </h3>
          {scoredPosts.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Brak postów do analizy</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scoredPosts.slice(0, 5).map((post, i) => (
                <div key={post.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  {/* Rank Medal */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-400'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                  </div>

                  {/* Post thumbnail */}
                  {post.full_picture && (
                    <img src={post.full_picture} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}

                  {/* Post content preview */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-700 line-clamp-1 font-medium">
                      {post.message?.substring(0, 60) || 'Bez tekstu'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">❤️ {post.likes}</span>
                      <span className="text-[10px] text-slate-400">💬 {post.comments}</span>
                      <span className="text-[10px] text-slate-400">🔁 {post.shares}</span>
                      {post.isVideo && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">VIDEO</span>}
                    </div>
                  </div>

                  {/* Score badge */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    post.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    post.score >= 40 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {post.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pixel Status Reminder */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">🎯</span>
          <div>
            <p className="text-sm font-bold text-green-800">Meta Pixel aktywny</p>
            <p className="text-xs text-green-600">ID: 1768581477440119 • śledzenie odwiedzających polendach24.de + polendach24.app</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-700 font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* CAPI Reminder */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">⚙️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Conversions API — wymaga wdrożenia</p>
            <p className="text-xs text-amber-600">Edge function <code className="bg-amber-100 px-1 rounded">facebook-capi</code> gotowa. Wgraj ją przez Supabase CLI po odświeżeniu tokena.</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs">⚡</span>
          Szybkie akcje
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nowy post', icon: '📝', color: 'from-blue-500 to-blue-600', tip: 'Najlepiej: wt-śr, 9-10 CET' },
            { label: 'AI Copywriter', icon: '🤖', color: 'from-purple-500 to-purple-600', tip: 'Generuj treści z AI' },
            { label: 'Nowa kampania', icon: '🎯', color: 'from-emerald-500 to-emerald-600', tip: 'Broad targeting = najlepszy ROI' },
            { label: 'Sprawdź konkurencję', icon: '🏆', color: 'from-amber-500 to-amber-600', tip: 'Meta Ad Library' },
          ].map((action, i) => (
            <button key={i} className={`bg-gradient-to-r ${action.color} rounded-lg px-4 py-3 text-left hover:brightness-110 transition-all group`}>
              <span className="text-lg">{action.icon}</span>
              <p className="text-xs font-semibold mt-1">{action.label}</p>
              <p className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">{action.tip}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
