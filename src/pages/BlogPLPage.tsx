import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BlogService } from '../services/database/blog.service';
import type { BlogPost } from '../services/database/blog.service';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════
// Blog PL — CMS z WYSIWYG i Asystentem AI (Claude)
// Zarządzanie treściami dla zadaszto.pl
// ═══════════════════════════════════════════════════

type ViewMode = 'list' | 'editor';

interface AIResponse {
    content: string;
    type: 'topic' | 'article' | 'seo' | 'improve';
}

export const BlogPLPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
    const [saving, setSaving] = useState(false);
    const [aiPanel, setAiPanel] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [aiMode, setAiMode] = useState<'topics' | 'write' | 'seo' | 'improve'>('topics');
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const data = await BlogService.getPosts();
            setPosts(data);
        } catch (err) {
            console.error('Error loading blog posts:', err);
            toast.error('Nie udało się załadować postów');
        } finally {
            setLoading(false);
        }
    };

    const handleNewPost = () => {
        setEditingPost({
            title: '',
            content: '',
            excerpt: '',
            image_url: null,
            is_published: false,
            meta_title: '',
            meta_description: '',
            tags: [],
            author_id: currentUser?.id,
        });
        setViewMode('editor');
    };

    const handleEditPost = async (post: BlogPost) => {
        try {
            const fullPost = await BlogService.getPost(post.id);
            setEditingPost(fullPost);
            setViewMode('editor');
        } catch (err) {
            toast.error('Nie udało się załadować postu');
        }
    };

    const handleSave = async () => {
        if (!editingPost?.title?.trim()) {
            toast.error('Tytuł jest wymagany');
            return;
        }

        // Sync content from contentEditable
        if (editorRef.current) {
            setEditingPost(prev => prev ? { ...prev, content: editorRef.current!.innerHTML } : prev);
        }

        setSaving(true);
        try {
            const content = editorRef.current?.innerHTML || editingPost.content || '';
            if (editingPost.id) {
                await BlogService.updatePost(editingPost.id, { ...editingPost, content });
                toast.success('Post zaktualizowany');
            } else {
                const created = await BlogService.createPost({ ...editingPost, content });
                setEditingPost(created);
                toast.success('Post utworzony');
            }
            await loadPosts();
        } catch (err: any) {
            toast.error(err.message || 'Błąd zapisu');
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!editingPost?.id) return;
        try {
            await BlogService.publishPost(editingPost.id);
            setEditingPost(prev => prev ? { ...prev, is_published: true, published_at: new Date().toISOString() } : prev);
            toast.success('Post opublikowany! 🎉');
            await loadPosts();
        } catch (err) {
            toast.error('Błąd publikacji');
        }
    };

    const handleUnpublish = async () => {
        if (!editingPost?.id) return;
        try {
            await BlogService.unpublishPost(editingPost.id);
            setEditingPost(prev => prev ? { ...prev, is_published: false, published_at: null } : prev);
            toast.success('Post wycofany');
            await loadPosts();
        } catch (err) {
            toast.error('Błąd wycofania');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten post? Tej operacji nie da się cofnąć.')) return;
        try {
            await BlogService.deletePost(id);
            toast.success('Post usunięty');
            if (editingPost?.id === id) {
                setEditingPost(null);
                setViewMode('list');
            }
            await loadPosts();
        } catch (err) {
            toast.error('Błąd usuwania');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast.loading('Przesyłanie obrazka...', { id: 'img-upload' });
            const url = await BlogService.uploadImage(file);
            setEditingPost(prev => prev ? { ...prev, image_url: url } : prev);
            toast.success('Obrazek przesłany', { id: 'img-upload' });
        } catch (err) {
            toast.error('Błąd przesyłania obrazka', { id: 'img-upload' });
        }
    };

    // ═══ AI Assistant ═══
    const handleAIGenerate = async () => {
        const apiKey = currentUser?.emailConfig?.openaiKey;

        setAiLoading(true);
        setAiResult('');

        const systemPrompts: Record<string, string> = {
            topics: `Jesteś ekspertem SEO i content marketingu dla polskiej branży zadaszeń aluminiowych, pergoli, carportów i wiat aluminiowych.
Firma to zadaszto.pl — wiodący dostawca nowoczesnych zadaszeń tarasowych w Polsce.
Produkty: zadaszenia tarasowe aluminiowe, pergole bioklimatyczne, carporty aluminiowe, wiaty garażowe, zadaszenia wolnostojące.
Zaproponuj 10 tematów na artykuły blogowe, które:
- Są zoptymalizowane pod SEO (ukierunkowane na konkretne frazy kluczowe)
- Odpowiadają na pytania, które potencjalni klienci wpisują w Google
- Pomagają pozycjonować firmę jako eksperta w branży
- Zawierają frazy lokalne (Polska, polskie warunki pogodowe)
Format: Lista numerowana z tytułem, propozycją fraz kluczowych i krótkim opisem treści.`,

            write: `Jesteś profesjonalnym copywriterem SEO specjalizującym się w branży zadaszeń aluminiowych, pergoli i carportów.
Firma: zadaszto.pl — polski lider w nowoczesnych zadaszeniach tarasowych.
Napisz pełny artykuł blogowy w formacie HTML (tylko treść, bez <html>, <body>).
Używaj tagów: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>.
Artykuł powinien:
- Mieć minimum 1500 słów
- Zawierać nagłówki H2 i H3 zoptymalizowane pod SEO
- Zawierać sekcję FAQ (Najczęściej Zadawane Pytania)  
- Naturalnie wplatać frazy kluczowe
- Być pisany w profesjonalnym ale przystępnym tonie
- Zawierać CTA (Call-to-Action) zachęcające do kontaktu z zadaszto.pl
- Uwzględniać polskie warunki klimatyczne i lokalne normy`,

            seo: `Jesteś ekspertem SEO. Na podstawie poniższej treści artykułu:
1. Zaproponuj optymalny meta title (max 60 znaków)
2. Zaproponuj meta description (max 155 znaków)  
3. Zaproponuj 5-8 tagów/fraz kluczowych
4. Oceń jakość SEO treści (skala 1-10) z rekomendacjami poprawy
5. Zaproponuj ulepszenia nagłówków H2/H3
Format odpowiedzi: Czysty tekst z sekcjami.`,

            improve: `Jesteś profesjonalnym redaktorem i ekspertem SEO.
Popraw poniższy tekst artykułu:
- Ulepsz styl i czytelność
- Dodaj brakujące frazy kluczowe dla branży zadaszeń
- Popraw strukturę nagłówków
- Dodaj lub ulepsz sekcję FAQ
- Wzmocnij CTA
- Zachowaj format HTML
Zwróć cały poprawiony artykuł w HTML.`
        };

        const userMessage = aiMode === 'topics'
            ? (aiPrompt || 'Zaproponuj tematy na artykuły blogowe dla zadaszto.pl')
            : aiMode === 'write'
                ? (aiPrompt || 'Napisz artykuł o zadaszeniach tarasowych aluminiowych')
                : aiMode === 'seo'
                    ? `Przeanalizuj SEO tego artykułu:\n\n${editingPost?.content || ''}`
                    : `Popraw ten artykuł:\n\n${editingPost?.content || ''}`;

        try {
            // Try Claude via edge function first, fallback to OpenAI
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/ai-blog-assistant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                    system: systemPrompts[aiMode],
                    message: userMessage,
                    apiKey: apiKey || undefined,
                }),
            });

            if (!response.ok) {
                // Fallback: use OpenAI directly if edge function unavailable
                if (apiKey) {
                    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: [
                                { role: 'system', content: systemPrompts[aiMode] },
                                { role: 'user', content: userMessage },
                            ],
                            max_tokens: 4000,
                            temperature: 0.7,
                        }),
                    });

                    if (!openaiResp.ok) throw new Error('AI API error');
                    const json = await openaiResp.json();
                    setAiResult(json.choices[0].message.content);
                } else {
                    throw new Error('Brak klucza API. Dodaj klucz OpenAI w Ustawienia → Poczta → Klucz AI.');
                }
            } else {
                const json = await response.json();
                setAiResult(json.content || json.text || JSON.stringify(json));
            }
        } catch (err: any) {
            toast.error(err.message || 'Błąd AI');
            setAiResult(`Błąd: ${err.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const insertAIContent = () => {
        if (!aiResult) return;

        if (aiMode === 'write' || aiMode === 'improve') {
            if (editorRef.current) {
                // Editor is open — inject directly
                editorRef.current.innerHTML = aiResult;
                setEditingPost(prev => prev ? { ...prev, content: aiResult } : prev);
                toast.success('Treść AI wstawiona do edytora');
                setAiPanel(false);
            } else {
                // No editor — create new post with AI content and open editor
                setEditingPost({
                    title: '',
                    content: aiResult,
                    excerpt: '',
                    image_url: null,
                    is_published: false,
                    meta_title: '',
                    meta_description: '',
                    tags: [],
                    author_id: currentUser?.id,
                });
                setViewMode('editor');
                setAiPanel(false);
                toast.success('Nowy artykuł utworzony z treścią AI — edytuj i zapisz!');
            }
        } else {
            if (editorRef.current) {
                editorRef.current.innerHTML += `\n\n${aiResult}`;
                setEditingPost(prev => prev ? { ...prev, content: editorRef.current!.innerHTML } : prev);
                setAiPanel(false);
            } else {
                // Copy to clipboard as fallback
                navigator.clipboard.writeText(aiResult);
                toast.success('Skopiowano wynik AI do schowka');
            }
        }
    };

    // ═══ WYSIWYG Toolbar ═══
    const execCommand = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
        editorRef.current?.focus();
    };

    const insertLink = () => {
        const url = prompt('Podaj URL:', 'https://');
        if (url) execCommand('createLink', url);
    };

    const insertImage = () => {
        const url = prompt('Podaj URL obrazka:');
        if (url) execCommand('insertImage', url);
    };

    // ═══ Filtered Posts ═══
    const filteredPosts = posts.filter(p => {
        if (filter === 'published') return p.is_published;
        if (filter === 'draft') return !p.is_published;
        return true;
    });

    if (loading) {
        return (
            <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
                <p className="text-slate-400 mt-4">Ładowanie bloga...</p>
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    // RENDER: POST LIST
    // ═══════════════════════════════════════════════
    if (viewMode === 'list') {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <span className="text-2xl">🇵🇱</span>
                            Blog PL — zadaszto.pl
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Zarządzaj artykułami blogowymi z asystentem AI
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setAiPanel(true); setAiMode('topics'); }}
                            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI: Tematy
                        </button>
                        <button
                            onClick={handleNewPost}
                            className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2"
                        >
                            + Nowy Artykuł
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <p className="text-2xl font-bold text-slate-900">{posts.length}</p>
                        <p className="text-xs text-slate-500 font-medium">Wszystkie</p>
                    </div>
                    <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{posts.filter(p => p.is_published).length}</p>
                        <p className="text-xs text-green-600 font-medium">Opublikowane</p>
                    </div>
                    <div className="bg-white rounded-xl border border-amber-200 p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">{posts.filter(p => !p.is_published).length}</p>
                        <p className="text-xs text-amber-600 font-medium">Wersje robocze</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2">
                    {(['all', 'published', 'draft'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {f === 'all' ? 'Wszystkie' : f === 'published' ? '✅ Opublikowane' : '📝 Wersje robocze'}
                        </button>
                    ))}
                </div>

                {/* Posts Grid */}
                {filteredPosts.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-xl font-bold text-slate-700">Brak artykułów</h3>
                        <p className="text-slate-500 mt-2">Kliknij "Nowy Artykuł" lub użyj AI do wygenerowania tematów.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.map(post => (
                            <div
                                key={post.id}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                                onClick={() => handleEditPost(post)}
                            >
                                {/* Cover Image */}
                                {post.image_url ? (
                                    <div className="h-48 bg-slate-100 overflow-hidden">
                                        <img
                                            src={post.image_url}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-48 bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                                        <span className="text-5xl opacity-30">📰</span>
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${post.is_published
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {post.is_published ? 'Opublikowany' : 'Wersja robocza'}
                                        </span>
                                        {post.tags && post.tags.length > 0 && (
                                            <span className="text-xs text-slate-400">{post.tags.length} tagów</span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2 group-hover:text-red-600 transition-colors">
                                        {post.title || 'Bez tytułu'}
                                    </h3>

                                    {post.excerpt && (
                                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{post.excerpt}</p>
                                    )}

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                        <span className="text-xs text-slate-400">
                                            {new Date(post.created_at).toLocaleDateString('pl-PL')}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Usuń"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* AI Panel Modal */}
                {aiPanel && <AIPanel
                    aiMode={aiMode}
                    setAiMode={setAiMode}
                    aiPrompt={aiPrompt}
                    setAiPrompt={setAiPrompt}
                    aiLoading={aiLoading}
                    aiResult={aiResult}
                    onGenerate={handleAIGenerate}
                    onClose={() => setAiPanel(false)}
                    onInsert={insertAIContent}
                    hasContent={!!editingPost?.content}
                />}
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    // RENDER: POST EDITOR
    // ═══════════════════════════════════════════════
    return (
        <div className="space-y-4">
            {/* Editor Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => { setViewMode('list'); setEditingPost(null); }}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Powrót do listy
                </button>

                <div className="flex gap-3">
                    <button
                        onClick={() => setAiPanel(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Asystent AI
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                        {saving ? '⏳ Zapisuję...' : '💾 Zapisz'}
                    </button>
                    {editingPost?.id && !editingPost.is_published && (
                        <button
                            onClick={handlePublish}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-sm hover:bg-green-700 transition-all flex items-center gap-2 text-sm"
                        >
                            🚀 Opublikuj
                        </button>
                    )}
                    {editingPost?.id && editingPost.is_published && (
                        <button
                            onClick={handleUnpublish}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold shadow-sm hover:bg-amber-600 transition-all text-sm"
                        >
                            ↩️ Wycofaj
                        </button>
                    )}
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Editor - 3 cols */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Title */}
                    <input
                        type="text"
                        placeholder="Tytuł artykułu..."
                        value={editingPost?.title || ''}
                        onChange={e => setEditingPost(prev => prev ? { ...prev, title: e.target.value } : prev)}
                        className="w-full text-3xl font-bold text-slate-900 border-0 border-b-2 border-slate-200 focus:border-red-500 outline-none pb-3 bg-transparent placeholder-slate-300 transition-colors"
                    />

                    {/* WYSIWYG Toolbar */}
                    <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10 shadow-sm">
                        <ToolbarBtn onClick={() => execCommand('bold')} title="Pogrubienie" icon="B" bold />
                        <ToolbarBtn onClick={() => execCommand('italic')} title="Kursywa" icon="I" italic />
                        <ToolbarBtn onClick={() => execCommand('underline')} title="Podkreślenie" icon="U" underline />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<h2>')} title="Nagłówek H2" icon="H2" />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<h3>')} title="Nagłówek H3" icon="H3" />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<p>')} title="Paragraf" icon="¶" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={() => execCommand('insertUnorderedList')} title="Lista" icon="•" />
                        <ToolbarBtn onClick={() => execCommand('insertOrderedList')} title="Lista numerowana" icon="1." />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<blockquote>')} title="Cytat" icon="❝" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={insertLink} title="Link" icon="🔗" />
                        <ToolbarBtn onClick={insertImage} title="Obrazek (URL)" icon="🖼️" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={() => execCommand('removeFormat')} title="Usuń formatowanie" icon="🧹" />
                        <ToolbarBtn onClick={() => document.execCommand('undo')} title="Cofnij" icon="↩️" />
                        <ToolbarBtn onClick={() => document.execCommand('redo')} title="Ponów" icon="↪️" />
                    </div>

                    {/* Content Editor */}
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="min-h-[500px] bg-white rounded-xl border border-slate-200 p-8 prose prose-lg max-w-none focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all
                            [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-slate-800 [&>h2]:mt-8 [&>h2]:mb-4
                            [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-slate-700 [&>h3]:mt-6 [&>h3]:mb-3
                            [&>p]:text-slate-600 [&>p]:leading-relaxed [&>p]:mb-4
                            [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2
                            [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-2
                            [&>blockquote]:border-l-4 [&>blockquote]:border-red-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-500
                            [&_a]:text-red-600 [&_a]:underline
                            [&_img]:rounded-lg [&_img]:shadow-md [&_img]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: editingPost?.content || '<p>Zacznij pisać artykuł tutaj...</p>' }}
                        onInput={() => {
                            if (editorRef.current) {
                                setEditingPost(prev => prev ? { ...prev, content: editorRef.current!.innerHTML } : prev);
                            }
                        }}
                    />
                </div>

                {/* Sidebar - 1 col */}
                <div className="space-y-4">
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Status</h3>
                        <div className={`px-3 py-2 rounded-lg text-sm font-bold text-center ${editingPost?.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                            }`}>
                            {editingPost?.is_published ? '✅ Opublikowany' : '📝 Wersja robocza'}
                        </div>
                        {editingPost?.published_at && (
                            <p className="text-xs text-slate-400 mt-2 text-center">
                                Opublikowano: {new Date(editingPost.published_at).toLocaleDateString('pl-PL')}
                            </p>
                        )}
                    </div>

                    {/* Cover Image */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Obrazek Okładki</h3>
                        {editingPost?.image_url ? (
                            <div className="relative group">
                                <img src={editingPost.image_url} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                                <button
                                    onClick={() => setEditingPost(prev => prev ? { ...prev, image_url: null } : prev)}
                                    className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                                    <span className="text-2xl block mb-2">📸</span>
                                    <span className="text-sm text-slate-500">Kliknij aby dodać</span>
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        )}
                    </div>

                    {/* Excerpt */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Zajawka</h3>
                        <textarea
                            placeholder="Krótki opis artykułu (widoczny na liście)..."
                            value={editingPost?.excerpt || ''}
                            onChange={e => setEditingPost(prev => prev ? { ...prev, excerpt: e.target.value } : prev)}
                            rows={3}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-100 resize-none"
                        />
                    </div>

                    {/* SEO */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                            🔍 SEO
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Meta Title</label>
                                <input
                                    type="text"
                                    placeholder="Tytuł dla Google..."
                                    value={editingPost?.meta_title || ''}
                                    onChange={e => setEditingPost(prev => prev ? { ...prev, meta_title: e.target.value } : prev)}
                                    className="w-full text-sm border border-slate-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-red-100"
                                    maxLength={60}
                                />
                                <div className={`text-[10px] mt-0.5 ${(editingPost?.meta_title?.length || 0) > 55 ? 'text-red-500' : 'text-slate-400'}`}>
                                    {editingPost?.meta_title?.length || 0}/60
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Meta Description</label>
                                <textarea
                                    placeholder="Opis dla Google..."
                                    value={editingPost?.meta_description || ''}
                                    onChange={e => setEditingPost(prev => prev ? { ...prev, meta_description: e.target.value } : prev)}
                                    rows={2}
                                    className="w-full text-sm border border-slate-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-red-100 resize-none"
                                    maxLength={155}
                                />
                                <div className={`text-[10px] mt-0.5 ${(editingPost?.meta_description?.length || 0) > 150 ? 'text-red-500' : 'text-slate-400'}`}>
                                    {editingPost?.meta_description?.length || 0}/155
                                </div>
                            </div>
                            <button
                                onClick={() => { setAiPanel(true); setAiMode('seo'); }}
                                className="w-full px-3 py-2 text-xs font-bold bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
                            >
                                ⚡ AI: Analizuj SEO
                            </button>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Tagi</h3>
                        <input
                            type="text"
                            placeholder="Wpisz tag i Enter..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                        setEditingPost(prev => prev ? { ...prev, tags: [...(prev.tags || []), val] } : prev);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-100"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {(editingPost?.tags || []).map((tag, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 group"
                                >
                                    #{tag}
                                    <button
                                        onClick={() => setEditingPost(prev => prev ? { ...prev, tags: prev.tags?.filter((_, idx) => idx !== i) } : prev)}
                                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Panel Modal */}
            {aiPanel && <AIPanel
                aiMode={aiMode}
                setAiMode={setAiMode}
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                aiLoading={aiLoading}
                aiResult={aiResult}
                onGenerate={handleAIGenerate}
                onClose={() => setAiPanel(false)}
                onInsert={insertAIContent}
                hasContent={!!(editingPost?.content && editingPost.content.length > 50)}
            />}
        </div>
    );
};

// ═══ Toolbar Button ═══
const ToolbarBtn: React.FC<{
    onClick: () => void;
    title: string;
    icon: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}> = ({ onClick, title, icon, bold, italic, underline }) => (
    <button
        onClick={onClick}
        title={title}
        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-700 hover:text-slate-900"
        style={{
            fontWeight: bold ? 'bold' : undefined,
            fontStyle: italic ? 'italic' : undefined,
            textDecoration: underline ? 'underline' : undefined,
        }}
    >
        {icon}
    </button>
);

// ═══ AI Panel Modal ═══
const AIPanel: React.FC<{
    aiMode: 'topics' | 'write' | 'seo' | 'improve';
    setAiMode: (m: 'topics' | 'write' | 'seo' | 'improve') => void;
    aiPrompt: string;
    setAiPrompt: (s: string) => void;
    aiLoading: boolean;
    aiResult: string;
    onGenerate: () => void;
    onClose: () => void;
    onInsert: () => void;
    hasContent: boolean;
}> = ({ aiMode, setAiMode, aiPrompt, setAiPrompt, aiLoading, aiResult, onGenerate, onClose, onInsert, hasContent }) => (
    <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Asystent AI — Blog zadaszto.pl
                        </h2>
                        <p className="text-purple-200 text-sm mt-1">
                            Generuj treści SEO dla branży zadaszeń aluminiowych
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-2 mt-4">
                    {[
                        { key: 'topics' as const, label: '💡 Tematy', desc: 'Propozycje artykułów' },
                        { key: 'write' as const, label: '✍️ Napisz', desc: 'Pełny artykuł' },
                        { key: 'seo' as const, label: '🔍 SEO', desc: 'Analiza SEO' },
                        { key: 'improve' as const, label: '✨ Popraw', desc: 'Ulepsz treść' },
                    ].map(m => (
                        <button
                            key={m.key}
                            onClick={() => setAiMode(m.key)}
                            disabled={!hasContent && (m.key === 'seo' || m.key === 'improve')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${aiMode === m.key
                                ? 'bg-white text-purple-700 shadow-md'
                                : 'text-white/80 hover:bg-white/10 disabled:opacity-30'
                                }`}
                        >
                            <div>{m.label}</div>
                            <div className="text-[10px] opacity-70 mt-0.5">{m.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Prompt */}
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                        {aiMode === 'topics' ? 'Wskazówki (opcjonalne):' :
                            aiMode === 'write' ? 'O czym ma być artykuł:' :
                                aiMode === 'seo' ? 'Dodatkowe wskazówki SEO:' :
                                    'Wskazówki do poprawy:'}
                    </label>
                    <textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder={
                            aiMode === 'topics' ? 'np. Skup się na carportach i pergolach bioklimatycznych...' :
                                aiMode === 'write' ? 'np. Napisz artykuł o zaletach pergoli bioklimatycznych w polskim klimacie...' :
                                    aiMode === 'seo' ? 'np. Skup się na frazach lokalnych...' :
                                        'np. Dodaj więcej informacji o cenach i dostępności...'
                        }
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-none"
                    />
                </div>

                {/* Quick Prompts for Topics */}
                {aiMode === 'topics' && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Szybkie propozycje:</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Pergole bioklimatyczne',
                                'Zadaszenia tarasowe',
                                'Carporty aluminiowe',
                                'Porównanie materiałów',
                                'Koszt zadaszenia',
                                'Montaż i serwis',
                                'Design i trendy 2026',
                                'Pogoda w Polsce',
                            ].map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => setAiPrompt(`Zaproponuj tematy artykułów o: ${topic}`)}
                                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors"
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Generate Button */}
                <button
                    onClick={onGenerate}
                    disabled={aiLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {aiLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            AI generuje treść...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generuj
                        </>
                    )}
                </button>

                {/* Result */}
                {aiResult && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Wynik AI:</h3>
                            {(aiMode === 'write' || aiMode === 'improve') && (
                                <button
                                    onClick={onInsert}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-1"
                                >
                                    📥 Wstaw do edytora
                                </button>
                            )}
                        </div>
                        <div
                            className="bg-slate-50 border border-slate-200 rounded-xl p-6 prose prose-sm max-w-none max-h-[50vh] overflow-y-auto
                                [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-slate-800
                                [&>h3]:text-base [&>h3]:font-semibold
                                [&>p]:text-slate-600 [&>p]:text-sm
                                [&>ul]:text-sm [&>ol]:text-sm"
                            dangerouslySetInnerHTML={{ __html: aiResult }}
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(aiResult);
                                toast.success('Skopiowano do schowka');
                            }}
                            className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                        >
                            📋 Kopiuj do schowka
                        </button>
                    </div>
                )}
            </div>
        </div>
    </>
);

export default BlogPLPage;
