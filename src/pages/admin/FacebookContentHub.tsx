import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FacebookService, type FBTemplate } from '../../services/database/facebook.service';
import toast from 'react-hot-toast';
import ContentCalendarTab from './ContentCalendarTab';

// ═══════════════════════════════════════════
// CONTENT HUB — Posts + Calendar + AI Creator
// ═══════════════════════════════════════════

type SubView = 'posts' | 'calendar' | 'create';

export default function ContentHubTab() {
    const [subView, setSubView] = useState<SubView>('posts');

    return (
        <div className="space-y-4">
            {/* Sub-navigation */}
            <div className="flex gap-2">
                {([
                    { id: 'posts' as SubView, label: '📋 Opublikowane posty', desc: 'Lista z FB' },
                    { id: 'create' as SubView, label: '✨ Nowy post AI', desc: 'Generator treści' },
                    { id: 'calendar' as SubView, label: '📅 Kalendarz', desc: 'Plan postów' },
                ]).map(sv => (
                    <button key={sv.id} onClick={() => setSubView(sv.id)}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            subView === sv.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                        }`}>
                        <p>{sv.label}</p>
                        <p className={`text-[10px] font-normal ${subView === sv.id ? 'text-blue-200' : 'text-slate-400'}`}>{sv.desc}</p>
                    </button>
                ))}
            </div>

            {subView === 'posts' && <PostsListView />}
            {subView === 'create' && <PostCreatorView />}
            {subView === 'calendar' && <ContentCalendarTab />}
        </div>
    );
}

// ─── Posts List ───
function PostsListView() {
    const [fbPosts, setFbPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const posts = await FacebookService.getFBPosts();
            setFbPosts(posts.data || []);
        } catch (err: any) {
            console.error('Failed to load posts:', err);
            setLoadError(err.message || 'Nie udało się załadować postów z Facebook');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">📋 Opublikowane posty ({fbPosts.length})</h3>
                <button onClick={loadData} className="text-xs text-blue-600 hover:text-blue-800 font-medium">🔄 Odśwież</button>
            </div>
            {loading ? (
                <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Ładuję posty z Facebook...</p>
                </div>
            ) : loadError ? (
                <div className="bg-red-50 border border-red-300 rounded-xl p-6 text-center">
                    <p className="text-2xl mb-2">⚠️</p>
                    <p className="text-sm font-bold text-red-800">Nie udało się załadować postów</p>
                    <p className="text-xs text-red-600 mt-1">{loadError}</p>
                    <button onClick={loadData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">🔄 Spróbuj ponownie</button>
                </div>
            ) : fbPosts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <p className="text-4xl mb-3">📝</p>
                    <p className="text-slate-500 font-medium">Brak postów</p>
                    <p className="text-xs text-slate-400 mt-1">Kliknij „Nowy post AI" aby utworzyć pierwszy</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {fbPosts.map((post: any, i: number) => {
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
                                <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border-t border-slate-100 rounded-b-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="flex items-center gap-1 text-slate-500"><span className="text-red-500">❤️</span> {likes}</span>
                                        <span className="flex items-center gap-1 text-slate-500"><span className="text-blue-500">💬</span> {comments}</span>
                                        {shares > 0 && <span className="flex items-center gap-1 text-slate-500"><span className="text-green-500">🔁</span> {shares}</span>}
                                    </div>
                                    {post.permalink_url && (
                                        <a href={post.permalink_url} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                                            Otwórz na FB →
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Post Creator with AI ───
function PostCreatorView() {
    const [content, setContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [quickTopic, setQuickTopic] = useState('');
    const [imageFormat, setImageFormat] = useState<'post' | 'square' | 'story'>('post');

    const FB_SIZES = {
        post: { w: 1200, h: 630, label: 'Post (1200×630)' },
        square: { w: 1080, h: 1080, label: 'Quadrat (1080×1080)' },
        story: { w: 1080, h: 1920, label: 'Story (1080×1920)' },
    };

    const QUICK_TOPICS = [
        { label: '🏗️ Realizacja', topic: 'Neue Kundenreferenz: Terrassenüberdachung, zufriedener Kunde, vorher-nachher' },
        { label: '📚 Ekspert-Tipp', topic: 'Aluminium vs Holz Überdachung – Vorteile, Langlebigkeit, Pflege' },
        { label: '🌸 Sezon', topic: 'Frühling 2026 – jetzt Terrassenüberdachung planen, Frühbucher-Vorteile' },
        { label: '⭐ Bewertung', topic: 'Google-Bewertung, zufriedener Kunde, 5 Sterne, Montage-Erfahrung' },
        { label: '🔧 Za kulisami', topic: 'Montage-Tag, Teamarbeit, professionelle Installation, Zeitraffer' },
        { label: '❓ Community', topic: 'Welche Überdachung passt zu Ihrem Garten? Umfrage, Quiz, Engagement' },
    ];

    const resizeImage = (file: File, targetW: number, targetH: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetW; canvas.height = targetH;
                const ctx = canvas.getContext('2d')!;
                const scale = Math.max(targetW / img.width, targetH / img.height);
                const sw = targetW / scale, sh = targetH / scale;
                const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas')), 'image/jpeg', 0.92);
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
            const fileName = `fb-posts/${Date.now()}-${size.w}x${size.h}.jpg`;
            const { error } = await supabase.storage.from('media').upload(fileName, resized, { contentType: 'image/jpeg', upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
            setMediaUrl(urlData.publicUrl);
            setImagePreview(urlData.publicUrl);
            toast.success(`✅ Zdjęcie ${size.w}×${size.h} przesłane!`);
        } catch (err: any) { toast.error('Upload: ' + err.message); }
        finally { setUploadingImage(false); }
    };

    const handleAIGenerate = async (topic: string) => {
        setGenerating(true);
        try {
            const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
                body: { analysisType: 'fb_post_generator', businessData: `Thema: ${topic}` }
            });
            if (error) throw error;
            const raw = (data.content || data.analysis || '').trim();
            const cleaned = raw.replace(/^#+\s.*$/gm, '').replace(/^---.*$/gm, '').replace(/^\*.*Powered by Claude\*$/gm, '').replace(/^\[.*\]$/gm, '').trim();
            setContent(cleaned || raw);
            toast.success('🤖 Post wygenerowany!');
        } catch (err: any) { toast.error('AI: ' + err.message); }
        finally { setGenerating(false); }
    };

    const handlePublish = async () => {
        if (!content.trim()) return toast.error('Wpisz treść posta');
        setPublishing(true);
        try {
            await FacebookService.publishPost({ message: content, ...(mediaUrl ? { url: mediaUrl } : {}) });
            await FacebookService.saveLocalPost({ content, media_urls: mediaUrl ? [mediaUrl] : [], post_type: mediaUrl ? 'image' : 'text', status: 'published', published_at: new Date().toISOString() });
            toast.success('✅ Post opublikowany na Facebook!');
            setContent(''); setMediaUrl(''); setImagePreview('');
        } catch (err: any) { toast.error('Publish: ' + err.message); }
        finally { setPublishing(false); }
    };

    return (
        <div className="space-y-4">
            {/* Quick AI Topics */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 text-white">
                <h3 className="font-bold text-sm mb-2">⚡ Szybki post AI — wybierz temat:</h3>
                <div className="flex flex-wrap gap-2">
                    {QUICK_TOPICS.map(qt => (
                        <button key={qt.label} onClick={() => handleAIGenerate(qt.topic)} disabled={generating}
                            className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg text-xs font-medium hover:bg-white/30 disabled:opacity-50 transition-all">
                            {qt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom AI topic */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-600 mb-2">🤖 Lub wpisz własny temat:</p>
                <div className="flex gap-2">
                    <input value={quickTopic} onChange={e => setQuickTopic(e.target.value)} placeholder="np. Carport-Montage in München, Winter-Aktion..."
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                    <button onClick={() => handleAIGenerate(quickTopic)} disabled={generating || !quickTopic.trim()}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                        {generating ? '⏳' : '🤖'} Generuj
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Text editor */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700">📝 Treść posta</h3>
                    <textarea value={content} onChange={e => setContent(e.target.value)} rows={10} placeholder="Wpisz treść posta lub użyj AI powyżej..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none" />

                    {/* Image upload */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            {(['post', 'square', 'story'] as const).map(f => (
                                <button key={f} onClick={() => setImageFormat(f)}
                                    className={`px-2 py-1 rounded text-[10px] font-medium ${imageFormat === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {FB_SIZES[f].label}
                                </button>
                            ))}
                        </div>
                        <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:border-blue-400 transition-colors">
                            <span className="text-sm">{uploadingImage ? '⏳ Przesyłam...' : '📸 Dodaj zdjęcie'}</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                        </label>
                        {imagePreview && <img src={imagePreview} alt="" className="w-full max-h-48 object-cover rounded-lg" />}
                    </div>

                    {/* Publish button */}
                    <button onClick={handlePublish} disabled={publishing || !content.trim()}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-sm">
                        {publishing ? '⏳ Publikuję...' : '🚀 Opublikuj na Facebook'}
                    </button>
                </div>

                {/* Live preview */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">👁️ Podgląd posta</h3>
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">P</div>
                            <div><p className="text-sm font-bold text-slate-800">Polendach24</p><p className="text-[10px] text-slate-400">Gerade eben · 🌍</p></div>
                        </div>
                        {content ? (
                            <div className="px-3 pb-3">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</p>
                            </div>
                        ) : (
                            <div className="px-3 pb-3 text-sm text-slate-400 italic">Treść posta pojawi się tutaj...</div>
                        )}
                        {imagePreview && <img src={imagePreview} alt="" className="w-full" />}
                        <div className="border-t border-slate-100 px-3 py-2 flex justify-around text-xs text-slate-400">
                            <span>👍 Gefällt mir</span><span>💬 Kommentieren</span><span>↗️ Teilen</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
