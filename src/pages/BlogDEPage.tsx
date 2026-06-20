import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BlogService } from '../services/database/blog.service';
import type { GeneratedArticle } from '../services/database/blog.service';
import type { BlogPost } from '../services/database/blog.service';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════
// Blog DE — CMS z WYSIWYG i Asystentem AI
// Zarządzanie treściami dla polendach24.de
// ═══════════════════════════════════════════════

type ViewMode = 'list' | 'editor';

// Kategorie (silo) MUSZĄ odpowiadać tym na stronie (polendach24.de/ratgeber → siloLabels/siloOrder).
const SILO_OPTIONS = [
    { value: '', label: '-- Brak --' },
    { value: 'terrassenueberdachung', label: 'Terrassenüberdachung' },
    { value: 'pergola', label: 'Pergola' },
    { value: 'bioklimatische-pergola', label: 'Bioklimatische Pergola' },
    { value: 'carport', label: 'Carport' },
    { value: 'wintergarten', label: 'Wintergarten' },
    { value: 'trust', label: 'Wissen & Vertrauen' },
];

export const BlogDEPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [editingPost, setEditingPost] = useState<Partial<BlogPost> & { silo?: string | null; priority?: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [aiPanel, setAiPanel] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiKeywords, setAiKeywords] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [aiArticle, setAiArticle] = useState<GeneratedArticle | null>(null);
    const [aiMode, setAiMode] = useState<'topics' | 'write' | 'seo' | 'improve'>('topics');
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadPosts(); }, []);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const data = await BlogService.getPosts(false, 'de');
            setPosts(data);
        } catch (err) {
            console.error('Error loading DE blog posts:', err);
            toast.error('Nie udalo sie zaladowac postow DE');
        } finally {
            setLoading(false);
        }
    };

    const handleNewPost = () => {
        setEditingPost({
            title: '', content: '', excerpt: '', image_url: null,
            is_published: false, meta_title: '', meta_description: '',
            tags: [], author_id: currentUser?.id,
            silo: null, priority: 3,
        });
        setViewMode('editor');
    };

    const handleEditPost = async (post: BlogPost) => {
        try {
            const fullPost = await BlogService.getPost(post.id);
            setEditingPost({ ...fullPost, silo: (fullPost as any).silo || null, priority: (fullPost as any).priority || 3 });
            setViewMode('editor');
        } catch { toast.error('Nie udalo sie zaladowac postu'); }
    };

    const handleSave = async () => {
        if (!editingPost?.title?.trim()) { toast.error('Tytul jest wymagany'); return; }
        if (editorRef.current) {
            setEditingPost(prev => prev ? { ...prev, content: editorRef.current!.innerHTML } : prev);
        }
        setSaving(true);
        try {
            const content = editorRef.current?.innerHTML || editingPost.content || '';
            const payload = { ...editingPost, content };
            if (editingPost.id) {
                await BlogService.updatePost(editingPost.id, payload);
                toast.success('Post zaktualizowany');
            } else {
                const created = await BlogService.createPost(payload, 'de');
                setEditingPost({ ...created, silo: (created as any).silo, priority: (created as any).priority });
                toast.success('Post utworzony');
            }
            await loadPosts();
        } catch (err: any) {
            toast.error(err.message || 'Blad zapisu');
        } finally { setSaving(false); }
    };

    const handlePublish = async () => {
        if (!editingPost?.id) return;
        try {
            await BlogService.publishPost(editingPost.id);
            setEditingPost(prev => prev ? { ...prev, is_published: true, published_at: new Date().toISOString() } : prev);
            toast.success('Post opublikowany na polendach24.de!');
            await loadPosts();
        } catch { toast.error('Blad publikacji'); }
    };

    const handleUnpublish = async () => {
        if (!editingPost?.id) return;
        try {
            await BlogService.unpublishPost(editingPost.id);
            setEditingPost(prev => prev ? { ...prev, is_published: false, published_at: null } : prev);
            toast.success('Post wycofany');
            await loadPosts();
        } catch { toast.error('Blad wycofania'); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunac ten post? Tej operacji nie da sie cofnac.')) return;
        try {
            await BlogService.deletePost(id);
            toast.success('Post usuniety');
            if (editingPost?.id === id) { setEditingPost(null); setViewMode('list'); }
            await loadPosts();
        } catch { toast.error('Blad usuwania'); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            toast.loading('Przesylanie obrazka...', { id: 'img-upload' });
            const url = await BlogService.uploadImage(file, 'de');
            setEditingPost(prev => prev ? { ...prev, image_url: url } : prev);
            toast.success('Obrazek przeslany', { id: 'img-upload' });
        } catch { toast.error('Blad przesylania obrazka', { id: 'img-upload' }); }
    };

    // ═══ SEO Score Calculator ═══
    const getSeoScore = () => {
        const title = editingPost?.meta_title || editingPost?.title || '';
        const desc = editingPost?.meta_description || '';
        const content = editingPost?.content || '';
        const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        const hasH2 = /<h2/i.test(content);
        const hasImage = !!editingPost?.image_url || /<img/i.test(content);

        const checks = [
            { label: 'Meta Title', ok: title.length >= 30 && title.length <= 60, warn: title.length > 0 && (title.length < 30 || title.length > 60), value: `${title.length}/60` },
            { label: 'Meta Description', ok: desc.length >= 120 && desc.length <= 155, warn: desc.length > 0 && (desc.length < 120 || desc.length > 155), value: `${desc.length}/155` },
            { label: 'Tresc (slowa)', ok: wordCount >= 1500, warn: wordCount >= 500 && wordCount < 1500, value: `${wordCount}` },
            { label: 'Naglowki H2', ok: hasH2, warn: false, value: hasH2 ? 'Tak' : 'Brak' },
            { label: 'Obrazek', ok: hasImage, warn: false, value: hasImage ? 'Tak' : 'Brak' },
        ];
        return checks;
    };

    // ═══ AI Assistant (German prompts) ═══
    const handleAIGenerate = async () => {
        setAiLoading(true); setAiResult(''); setAiArticle(null);

        // WRITE → strukturierter, publikationsreifer Artikel: füllt ALLE SEO-Felder auf einmal.
        if (aiMode === 'write') {
            try {
                const art = await BlogService.generateArticle({
                    topic: aiPrompt || 'Aluminium-Terrassenüberdachungen',
                    keywords: aiKeywords.trim() || undefined,
                    silo: (editingPost as any)?.silo || undefined,
                });
                setAiArticle(art);
                setAiResult(art.content);
            } catch (err: any) {
                toast.error(err.message || 'Blad AI');
                setAiResult(`Blad: ${err.message || ''}`);
            } finally { setAiLoading(false); }
            return;
        }

        const apiKey = currentUser?.emailConfig?.openaiKey;

        // Geteilter Experten-Kontext: Marke, echte interne Links, Sicherheit/E-E-A-T.
        const SITE_CONTEXT = `KONTEXT — Polendach24 (polendach24.de):
Premium-Hersteller maßgefertigter Aluminium-Terrassenüberdachungen, Pergolen (bioklimatisch), Carports, Wintergärten und Glas-Schiebewände. Eigene Produktion, eigenes Montageteam, Lieferung + Montage zum Festpreis nach Aufmaß.
Modellnamen IMMER korrekt: Trendstyle, Trendstyle+, Topstyle, Topstyle XL, Skystyle, Designstyle, Orangestyle, Ultrastyle. NIEMALS interne Namen (Trendline/Topline/Skyline …).

INTERNE LINKS — baue 3–6 thematisch passende natürlich in den Fließtext ein, als <a href="…">beschreibender Ankertext</a>:
- Produkte: /terrassenueberdachung · /pergola · /carport · /wintergarten/wintergaerten · /glasschiebewaende
- /terrassenueberdachung-aus-polen · /konfigurator (3D-Konfigurator) · /referenzen
- Regionen: /liefergebiet · /liefergebiet/berlin-brandenburg · Städte z. B. /terrassenueberdachung-berlin, -dresden, -leipzig, -cottbus, -potsdam, -magdeburg, -halle
- Ratgeber: /ratgeber/was-kostet-eine-terrassenueberdachung-aus-aluminium · /ratgeber/baugenehmigung-terrassenueberdachung · /ratgeber/terrassenueberdachung-schneelast · /ratgeber/glas-oder-polycarbonat-dach · /ratgeber/alu-oder-holz-terrassenueberdachung · /ratgeber/ral-farben-terrassenueberdachung

SICHERHEIT / E-E-A-T:
- KEINE konkreten Preise, Garantie-Jahre oder technischen Werte (Schneelast-kg, Spannweiten, RAL) erfinden. Wenn Kosten Thema sind: ausdrücklich als „Richtwerte/Orientierung" kennzeichnen und auf kostenloses Aufmaß + verbindliches Festpreisangebot verweisen.
- Bauvorschriften nur allgemein halten (verbindliche Auskunft erteilt das zuständige Bauamt). Keine erfundenen Statistiken, Studien oder Kundenstimmen.
- Sprache: Deutsch, Sie-Form. Hochwertig, ehrlich, hilfreich, ohne Floskel-Häufung und ohne Superlativ-Inflation.`;

        const systemPrompts: Record<string, string> = {
            topics: `${SITE_CONTEXT}

AUFGABE: Du bist Senior-SEO-Stratege. Schlage 10 Blog-Artikel-Ideen vor, die echte Google-Suchintentionen treffen. Gib pro Idee an:
1) Titel (klickstark, mit Haupt-Keyword vorne),
2) Haupt-Keyword + 3–5 sekundäre/LSI-Keywords,
3) Suchintention (Information / Vergleich / Transaktion) + Funnel-Stufe (oben/mitte/unten),
4) empfohlenes Silo (terrassenueberdachung / pergola / carport / wintergarten),
5) Inhaltswinkel in 1 Satz + 1 passender interner Link aus der Liste.
Priorisiere Themen mit Kauf- oder Lokalbezug (Stadt/Region) und echtem Suchvolumen-Potenzial. Klar nummerierte, scanbare Liste.`,

            write: `${SITE_CONTEXT}

AUFGABE: Schreibe einen vollständigen, erstklassigen SEO-Blogartikel — auf dem Niveau eines professionellen deutschen Copywriters.
AUSGABE: NUR HTML-Inhalt (ohne <html>/<body>). Erlaubte Tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <a>, <table>.
ANFORDERUNGEN:
- 1500–2200 Wörter; klare H2/H3-Gliederung, die die Suchintention Schritt für Schritt beantwortet.
- Haupt-Keyword in der Einleitung (erste 100 Wörter) und in mind. einer H2; sekundäre/LSI-Keywords natürlich verteilen — KEIN Keyword-Stuffing.
- Echter Mehrwert: Entscheidungshilfen, Vergleiche, Checklisten; wo sinnvoll eine <table>-Vergleichstabelle.
- 3–6 thematisch passende interne Links aus der Liste mit beschreibendem Ankertext.
- Pflicht: ein <h2>Häufige Fragen</h2>-Abschnitt mit 3–5 echten Nutzerfragen als <h3> + jeweils kurzer, präziser Antwort (FAQ-Schema-tauglich).
- Abschluss mit dezentem, ehrlichem CTA (kostenloses Aufmaß / Festpreisangebot / 3D-Konfigurator).
- Beginne direkt mit Einleitung oder erstem <h2> — keine Vorbemerkung an mich, keine Markdown-Codefences.`,

            seo: `${SITE_CONTEXT}

AUFGABE: Führe ein professionelles SEO-Audit des folgenden Artikels durch und liefere KONKRETE, sofort nutzbare Ergebnisse:
1) Optimaler Meta-Titel (≤60 Zeichen) — fertig zum Kopieren.
2) Meta-Beschreibung (≤155 Zeichen) — fertig, mit dezenter CTA.
3) Haupt-Keyword + 6–10 sekundäre/LSI-Keywords (kommagetrennt, direkt als Tags nutzbar).
4) Keyword-Abdeckung & -Dichte: was fehlt, wo nachschärfen?
5) Überschriften-Struktur (H2/H3): konkrete Verbesserungen.
6) Interne Verlinkung: welche 3–5 internen Links aus der Liste ergänzen?
7) SEO-Score (1–10) + die 3 wichtigsten Hebel.
Antworte auf Deutsch, klar gegliedert (nutze <h3>/<ul> für Lesbarkeit).`,

            improve: `${SITE_CONTEXT}

AUFGABE: Überarbeite den folgenden Artikel auf Profi-Copywriter-Niveau und gib den GESAMTEN verbesserten Artikel als HTML zurück (gleiche Tag-Regeln wie beim Schreiben):
- Stil, Lesefluss und Struktur verbessern; schwache/dünne Passagen umschreiben und vertiefen.
- Fehlende relevante Keywords/LSI natürlich ergänzen (kein Stuffing).
- H2/H3-Struktur an die Suchintention anpassen.
- 3–6 passende interne Links aus der Liste ergänzen (sofern noch nicht vorhanden).
- <h2>Häufige Fragen</h2>-Abschnitt ergänzen oder verbessern (3–5 Q&A).
- CTA stärken — ehrlich, ohne erfundene Preise/Garantien.
Gib ausschließlich den fertigen HTML-Artikel zurück, keine Vorbemerkung, keine Codefences.`
        };

        const kw = aiKeywords.trim();
        const ctxLines = [
            editingPost?.title ? `Arbeitstitel: ${editingPost.title}` : '',
            (editingPost as any)?.silo ? `Silo/Kategorie: ${(editingPost as any).silo}` : '',
            kw ? `Ziel-Keywords (Haupt-Keyword zuerst, natürlich einbauen): ${kw}` : '',
        ].filter(Boolean).join('\n');

        const userMessage = aiMode === 'topics'
            ? `Themenbereich: ${aiPrompt || 'allgemein für polendach24.de'}${kw ? `\nFokus-Keywords: ${kw}` : ''}`
            : aiMode === 'write'
                ? `Thema des Artikels: ${aiPrompt || 'Aluminium-Terrassenüberdachungen'}${ctxLines ? `\n${ctxLines}` : ''}`
                : aiMode === 'seo'
                    ? `Analysiere das SEO dieses Artikels:${kw ? `\nZiel-Keywords: ${kw}` : ''}\n\n${editingPost?.content || ''}`
                    : `Verbessere diesen Artikel:${ctxLines ? `\n${ctxLines}` : ''}\n\n${editingPost?.content || ''}`;

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/ai-blog-assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ system: systemPrompts[aiMode], message: userMessage, apiKey: apiKey || undefined }),
            });

            if (!response.ok) {
                if (apiKey) {
                    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: 'gpt-4o', messages: [
                                { role: 'system', content: systemPrompts[aiMode] },
                                { role: 'user', content: userMessage },
                            ], max_tokens: 4000, temperature: 0.7,
                        }),
                    });
                    if (!openaiResp.ok) throw new Error('AI API error');
                    const json = await openaiResp.json();
                    setAiResult(json.choices[0].message.content);
                } else {
                    throw new Error('Brak klucza API. Dodaj klucz OpenAI w Ustawienia.');
                }
            } else {
                const json = await response.json();
                setAiResult(json.content || json.text || JSON.stringify(json));
            }
        } catch (err: any) {
            toast.error(err.message || 'Blad AI');
            setAiResult(`Blad: ${err.message}`);
        } finally { setAiLoading(false); }
    };

    const insertAIContent = () => {
        // Strukturierter WRITE-Artikel → kompletten Beitrag inkl. aller SEO-Felder einfügen.
        if (aiArticle) {
            const a = aiArticle;
            setEditingPost(prev => ({
                ...(prev || { is_published: false, author_id: currentUser?.id }),
                title: a.title || prev?.title || '',
                content: a.content,
                excerpt: a.excerpt || '',
                meta_title: a.metaTitle || '',
                meta_description: a.metaDescription || '',
                tags: a.tags || [],
                silo: a.suggestedSilo || (prev as any)?.silo || null,
                image_alt: a.coverImageAlt || (prev as any)?.image_alt || '',
                priority: (prev as any)?.priority || 3,
            }) as any);
            if (editorRef.current) editorRef.current.innerHTML = a.content;
            setViewMode('editor');
            setAiPanel(false);
            toast.success('Artykuł + pola SEO wypełnione — sprawdź i opublikuj!');
            return;
        }
        if (!aiResult) return;
        if (aiMode === 'write' || aiMode === 'improve') {
            if (editorRef.current) {
                editorRef.current.innerHTML = aiResult;
                setEditingPost(prev => prev ? { ...prev, content: aiResult } : prev);
                toast.success('Tresc AI wstawiona do edytora');
                setAiPanel(false);
            } else {
                setEditingPost({
                    title: '', content: aiResult, excerpt: '', image_url: null,
                    is_published: false, meta_title: '', meta_description: '',
                    tags: [], author_id: currentUser?.id, silo: null, priority: 3,
                });
                setViewMode('editor');
                setAiPanel(false);
                toast.success('Nowy artykul z trescia AI — edytuj i zapisz!');
            }
        } else {
            if (editorRef.current) {
                editorRef.current.innerHTML += `\n\n${aiResult}`;
                setEditingPost(prev => prev ? { ...prev, content: editorRef.current!.innerHTML } : prev);
                setAiPanel(false);
            } else {
                navigator.clipboard.writeText(aiResult);
                toast.success('Skopiowano wynik AI do schowka');
            }
        }
    };

    // ═══ WYSIWYG Toolbar ═══
    const execCommand = (cmd: string, value?: string) => { document.execCommand(cmd, false, value); editorRef.current?.focus(); };
    const insertLink = () => { const url = prompt('Podaj URL:', 'https://'); if (url) execCommand('createLink', url); };
    const insertImage = () => {
        const url = prompt('Podaj URL obrazka:');
        if (!url) return;
        const alt = prompt('Alt-Text (opis zdjęcia po niemiecku — ważne dla SEO):', '') || '';
        execCommand('insertHTML', `<img src="${url}" alt="${alt.replace(/"/g, '&quot;')}" />`);
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                <p className="text-slate-400 mt-4">Ladowanie bloga DE...</p>
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
                            <span className="text-2xl">DE</span>
                            Blog DE — polendach24.de
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Artykuly blogowe dla polendach24.de z asystentem AI (tresc po niemiecku)
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
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            + Nowy Artykul
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
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {f === 'all' ? 'Wszystkie' : f === 'published' ? 'Opublikowane' : 'Wersje robocze'}
                        </button>
                    ))}
                </div>

                {/* Posts Grid */}
                {filteredPosts.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                        <h3 className="text-xl font-bold text-slate-700">Brak artykulow DE</h3>
                        <p className="text-slate-500 mt-2">Kliknij "Nowy Artykul" lub uzyj AI do wygenerowania tematow.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.map(post => (
                            <div key={post.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => handleEditPost(post)}>
                                {post.image_url ? (
                                    <div className="h-48 bg-slate-100 overflow-hidden">
                                        <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                ) : (
                                    <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                                        <span className="text-5xl opacity-30">DE</span>
                                    </div>
                                )}
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {post.is_published ? 'Opublikowany' : 'Wersja robocza'}
                                        </span>
                                        {(post as any).silo && <span className="text-xs text-blue-500 font-medium">{(post as any).silo}</span>}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">{post.title || 'Bez tytulu'}</h3>
                                    {post.excerpt && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{post.excerpt}</p>}
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                        <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString('pl-PL')}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Usun">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* AI Panel Modal */}
                {aiPanel && <AIPanelDE aiMode={aiMode} setAiMode={setAiMode} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} aiKeywords={aiKeywords} setAiKeywords={setAiKeywords} aiLoading={aiLoading} aiResult={aiResult} onGenerate={handleAIGenerate} onClose={() => setAiPanel(false)} aiArticle={aiArticle} onInsert={insertAIContent} hasContent={!!editingPost?.content} />}
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    // RENDER: POST EDITOR
    // ═══════════════════════════════════════════════
    const seoChecks = getSeoScore();

    return (
        <div className="space-y-4">
            {/* Editor Header */}
            <div className="flex items-center justify-between">
                <button onClick={() => { setViewMode('list'); setEditingPost(null); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Powrot do listy
                </button>
                <div className="flex gap-3">
                    <button onClick={() => setAiPanel(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Asystent AI
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm">
                        {saving ? 'Zapisuje...' : 'Zapisz'}
                    </button>
                    {editingPost?.id && !editingPost.is_published && (
                        <button onClick={handlePublish} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-sm hover:bg-green-700 transition-all flex items-center gap-2 text-sm">
                            Opublikuj
                        </button>
                    )}
                    {editingPost?.id && editingPost.is_published && (
                        <button onClick={handleUnpublish} className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold shadow-sm hover:bg-amber-600 transition-all text-sm">
                            Wycofaj
                        </button>
                    )}
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Editor - 3 cols */}
                <div className="lg:col-span-3 space-y-4">
                    <input type="text" placeholder="Titel des Artikels..." value={editingPost?.title || ''}
                        onChange={e => setEditingPost(prev => prev ? { ...prev, title: e.target.value } : prev)}
                        className="w-full text-3xl font-bold text-slate-900 border-0 border-b-2 border-slate-200 focus:border-blue-500 outline-none pb-3 bg-transparent placeholder-slate-300 transition-colors"
                    />

                    {/* WYSIWYG Toolbar */}
                    <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10 shadow-sm">
                        <ToolbarBtn onClick={() => execCommand('bold')} title="Pogrubienie" icon="B" bold />
                        <ToolbarBtn onClick={() => execCommand('italic')} title="Kursywa" icon="I" italic />
                        <ToolbarBtn onClick={() => execCommand('underline')} title="Podkreslenie" icon="U" underline />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<h2>')} title="H2" icon="H2" />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<h3>')} title="H3" icon="H3" />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<p>')} title="Paragraf" icon="P" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={() => execCommand('insertUnorderedList')} title="Lista" icon="UL" />
                        <ToolbarBtn onClick={() => execCommand('insertOrderedList')} title="Lista num." icon="OL" />
                        <ToolbarBtn onClick={() => execCommand('formatBlock', '<blockquote>')} title="Cytat" icon="BQ" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={insertLink} title="Link" icon="LNK" />
                        <ToolbarBtn onClick={insertImage} title="Obrazek (URL)" icon="IMG" />
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <ToolbarBtn onClick={() => execCommand('removeFormat')} title="Usun format." icon="CLR" />
                        <ToolbarBtn onClick={() => document.execCommand('undo')} title="Cofnij" icon="<-" />
                        <ToolbarBtn onClick={() => document.execCommand('redo')} title="Ponow" icon="->" />
                    </div>

                    {/* Content Editor */}
                    <div ref={editorRef} contentEditable suppressContentEditableWarning
                        className="min-h-[500px] bg-white rounded-xl border border-slate-200 p-8 prose prose-lg max-w-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all
                            [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-slate-800 [&>h2]:mt-8 [&>h2]:mb-4
                            [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-slate-700 [&>h3]:mt-6 [&>h3]:mb-3
                            [&>p]:text-slate-600 [&>p]:leading-relaxed [&>p]:mb-4
                            [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2
                            [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-2
                            [&>blockquote]:border-l-4 [&>blockquote]:border-blue-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-500
                            [&_a]:text-blue-600 [&_a]:underline
                            [&_img]:rounded-lg [&_img]:shadow-md [&_img]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: editingPost?.content || '<p>Beginnen Sie hier zu schreiben...</p>' }}
                        onInput={() => { if (editorRef.current) setEditingPost(prev => prev ? { ...prev, content: editorRef.current!.innerHTML } : prev); }}
                    />
                </div>

                {/* Sidebar - 1 col */}
                <div className="space-y-4">
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Status</h3>
                        <div className={`px-3 py-2 rounded-lg text-sm font-bold text-center ${editingPost?.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {editingPost?.is_published ? 'Opublikowany' : 'Wersja robocza'}
                        </div>
                        {editingPost?.published_at && <p className="text-xs text-slate-400 mt-2 text-center">Opublikowano: {new Date(editingPost.published_at).toLocaleDateString('pl-PL')}</p>}
                    </div>

                    {/* Slug Preview */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider">URL podglad</h3>
                        <div className="text-xs text-slate-500 break-all bg-slate-50 p-2 rounded-lg font-mono">
                            polendach24.de/ratgeber/{editingPost?.slug || '...'}
                        </div>
                        {editingPost?.is_published && editingPost?.slug && (
                            <a href={`https://polendach24.de/ratgeber/${editingPost.slug}`} target="_blank" rel="noopener noreferrer"
                                className="mt-2 w-full px-3 py-2 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                                Otworz na stronie
                            </a>
                        )}
                    </div>

                    {/* SEO Silo */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Kategoria SEO (Silo)</h3>
                        <select value={editingPost?.silo || ''} onChange={e => setEditingPost(prev => prev ? { ...prev, silo: e.target.value || null } : prev)}
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100">
                            {SILO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Priority */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Priorytet</h3>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(p => (
                                <button key={p} onClick={() => setEditingPost(prev => prev ? { ...prev, priority: p } : prev)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${(editingPost?.priority || 3) === p
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 text-center">1 = najwyzszy, 5 = najnizszy</p>
                    </div>

                    {/* Cover Image */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Obrazek Okladki</h3>
                        {editingPost?.image_url ? (
                            <div className="relative group">
                                <img src={editingPost.image_url} alt={editingPost.image_alt || 'Cover'} className="w-full h-32 object-cover rounded-lg" />
                                <button onClick={() => setEditingPost(prev => prev ? { ...prev, image_url: null } : prev)}
                                    className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                            </div>
                        ) : (
                            <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                    <span className="text-sm text-slate-500">Kliknij aby dodac</span>
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        )}
                        <div className="mt-3">
                            <label className="text-xs text-slate-500 font-medium">Alt-Text (SEO)</label>
                            <input type="text" placeholder="Titelbild-Beschreibung mit Keyword..."
                                value={editingPost?.image_alt || ''}
                                onChange={e => setEditingPost(prev => prev ? { ...prev, image_alt: e.target.value } : prev)}
                                className="w-full text-sm border border-slate-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                    </div>

                    {/* Excerpt */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Zajawka</h3>
                        <textarea placeholder="Kurze Beschreibung des Artikels..."
                            value={editingPost?.excerpt || ''}
                            onChange={e => setEditingPost(prev => prev ? { ...prev, excerpt: e.target.value } : prev)}
                            rows={3} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
                    </div>

                    {/* SEO */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">SEO</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Meta Title</label>
                                <input type="text" placeholder="Titel fuer Google..." value={editingPost?.meta_title || ''}
                                    onChange={e => setEditingPost(prev => prev ? { ...prev, meta_title: e.target.value } : prev)}
                                    className="w-full text-sm border border-slate-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-blue-100" maxLength={60} />
                                <div className={`text-[10px] mt-0.5 ${(editingPost?.meta_title?.length || 0) > 55 ? 'text-red-500' : 'text-slate-400'}`}>{editingPost?.meta_title?.length || 0}/60</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Meta Description</label>
                                <textarea placeholder="Beschreibung fuer Google..." value={editingPost?.meta_description || ''}
                                    onChange={e => setEditingPost(prev => prev ? { ...prev, meta_description: e.target.value } : prev)}
                                    rows={2} className="w-full text-sm border border-slate-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-blue-100 resize-none" maxLength={155} />
                                <div className={`text-[10px] mt-0.5 ${(editingPost?.meta_description?.length || 0) > 150 ? 'text-red-500' : 'text-slate-400'}`}>{editingPost?.meta_description?.length || 0}/155</div>
                            </div>
                            <button onClick={() => { setAiPanel(true); setAiMode('seo'); }}
                                className="w-full px-3 py-2 text-xs font-bold bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1">
                                AI: Analizuj SEO
                            </button>
                        </div>
                    </div>

                    {/* SEO Score */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">SEO Score</h3>
                        <div className="space-y-2">
                            {seoChecks.map((check, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600">{check.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400">{check.value}</span>
                                        <span className={`w-2.5 h-2.5 rounded-full ${check.ok ? 'bg-green-500' : check.warn ? 'bg-amber-400' : 'bg-red-400'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Tagi</h3>
                        <input type="text" placeholder="Wpisz tag i Enter..."
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
                            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100" />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {(editingPost?.tags || []).map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1 group">
                                    #{tag}
                                    <button onClick={() => setEditingPost(prev => prev ? { ...prev, tags: prev.tags?.filter((_, idx) => idx !== i) } : prev)}
                                        className="text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Panel Modal */}
            {aiPanel && <AIPanelDE aiMode={aiMode} setAiMode={setAiMode} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} aiKeywords={aiKeywords} setAiKeywords={setAiKeywords} aiLoading={aiLoading} aiResult={aiResult} onGenerate={handleAIGenerate} onClose={() => setAiPanel(false)} aiArticle={aiArticle} onInsert={insertAIContent} hasContent={!!(editingPost?.content && editingPost.content.length > 50)} />}
        </div>
    );
};

// ═══ Toolbar Button ═══
const ToolbarBtn: React.FC<{ onClick: () => void; title: string; icon: string; bold?: boolean; italic?: boolean; underline?: boolean }> = ({ onClick, title, icon, bold, italic, underline }) => (
    <button onClick={onClick} title={title}
        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-700 hover:text-slate-900"
        style={{ fontWeight: bold ? 'bold' : undefined, fontStyle: italic ? 'italic' : undefined, textDecoration: underline ? 'underline' : undefined }}>
        {icon}
    </button>
);

// ═══ AI Panel (German market) ═══
const AIPanelDE: React.FC<{
    aiMode: 'topics' | 'write' | 'seo' | 'improve';
    setAiMode: (m: 'topics' | 'write' | 'seo' | 'improve') => void;
    aiPrompt: string; setAiPrompt: (s: string) => void;
    aiKeywords: string; setAiKeywords: (s: string) => void;
    aiLoading: boolean; aiResult: string;
    aiArticle: GeneratedArticle | null;
    onGenerate: () => void; onClose: () => void; onInsert: () => void;
    hasContent: boolean;
}> = ({ aiMode, setAiMode, aiPrompt, setAiPrompt, aiKeywords, setAiKeywords, aiLoading, aiResult, aiArticle, onGenerate, onClose, onInsert, hasContent }) => (
    <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Asystent AI — Blog polendach24.de
                        </h2>
                        <p className="text-purple-200 text-sm mt-1">Generuj tresci SEO po niemiecku dla rynku zadaszen</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {/* Mode Tabs */}
                <div className="flex gap-2 mt-4">
                    {[
                        { key: 'topics' as const, label: 'Tematy', desc: 'Propozycje + keywords' },
                        { key: 'write' as const, label: 'Napisz', desc: 'Artykuł + SEO + zdjęcia' },
                        { key: 'seo' as const, label: 'SEO', desc: 'Analiza + meta/tagi' },
                        { key: 'improve' as const, label: 'Popraw', desc: 'Ulepsz tresc' },
                    ].map(m => (
                        <button key={m.key} onClick={() => setAiMode(m.key)} disabled={!hasContent && (m.key === 'seo' || m.key === 'improve')}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${aiMode === m.key ? 'bg-white text-purple-700 shadow-md' : 'text-white/80 hover:bg-white/10 disabled:opacity-30'}`}>
                            <div>{m.label}</div>
                            <div className="text-[10px] opacity-70 mt-0.5">{m.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">
                        {aiMode === 'topics' ? 'Wskazowki (opcjonalne):' : aiMode === 'write' ? 'O czym ma byc artykul:' : aiMode === 'seo' ? 'Dodatkowe wskazowki SEO:' : 'Wskazowki do poprawy:'}
                    </label>
                    <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                        placeholder={
                            aiMode === 'topics' ? 'np. Terrassenueberdachung Kosten, Baugenehmigung...' :
                            aiMode === 'write' ? 'np. Artikel ueber Vor- und Nachteile von Aluminium-Terrassenueberdachungen...' :
                            aiMode === 'seo' ? 'np. Fokus auf lokale SEO-Phrasen...' :
                            'np. Mehr Informationen ueber Preise und Verfuegbarkeit...'
                        }
                        rows={3} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-purple-100 resize-none" />
                </div>

                {/* Ziel-Keywords */}
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Słowa kluczowe (Ziel-Keywords, opcjonalnie):</label>
                    <input type="text" value={aiKeywords} onChange={e => setAiKeywords(e.target.value)}
                        placeholder="np. terrassenüberdachung alu, kosten, baugenehmigung sachsen"
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                    <p className="text-[11px] text-slate-400 mt-1">Pierwsze = główne słowo kluczowe (trafia do H1, wstępu i meta). Reszta wplatana naturalnie, bez przesycania.</p>
                </div>

                {/* Quick Prompts for Topics (German market) */}
                {aiMode === 'topics' && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Szybkie propozycje (DE):</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Terrassenueberdachung Kosten',
                                'Pergola vs Terrassendach',
                                'Carport Baugenehmigung',
                                'Wintergarten Planung',
                                'Schneelast Berechnung',
                                'Terrassendach Materialien',
                                'Glasdach Reinigung',
                                'Freistehende Ueberdachung',
                            ].map(topic => (
                                <button key={topic} onClick={() => setAiPrompt(`Schlage Artikel-Themen vor zu: ${topic}`)}
                                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors">
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Generate Button */}
                <button onClick={onGenerate} disabled={aiLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {aiLoading ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />AI generuje tresc...</>
                    ) : (
                        <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generuj</>
                    )}
                </button>

                {/* Auto-gefüllte SEO-Felder + Bild-Empfehlungen (WRITE) */}
                {aiMode === 'write' && aiArticle && (
                    <div className="space-y-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Pola SEO wypełnią się automatycznie</p>
                        <div className="text-xs text-slate-600 space-y-1">
                            <div><span className="font-semibold">Meta-Title:</span> {aiArticle.metaTitle} <span className="text-slate-400">({aiArticle.metaTitle.length}/60)</span></div>
                            <div><span className="font-semibold">Meta-Desc:</span> {aiArticle.metaDescription} <span className="text-slate-400">({aiArticle.metaDescription.length}/155)</span></div>
                            <div><span className="font-semibold">Silo:</span> {aiArticle.suggestedSilo || '—'} · <span className="font-semibold">Slug:</span> {aiArticle.slug}</div>
                            <div><span className="font-semibold">Tagi:</span> {aiArticle.tags.join(', ')}</div>
                            <div><span className="font-semibold">Alt okładki:</span> {aiArticle.coverImageAlt}</div>
                        </div>
                        {aiArticle.imageBriefs.length > 0 && (
                            <div className="pt-1 border-t border-violet-200">
                                <p className="text-xs font-bold text-violet-700 mt-1">Sugerowane zdjęcia (z gotowym alt):</p>
                                <ul className="text-xs text-slate-600 space-y-1 mt-1">
                                    {aiArticle.imageBriefs.map((b, i) => (
                                        <li key={i}><span className="font-semibold">{b.placement || `Zdjęcie ${i + 1}`}:</span> {b.description} <span className="text-slate-400">— alt: „{b.alt}"</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Result */}
                {aiResult && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Wynik AI:</h3>
                            {(aiMode === 'write' || aiMode === 'improve') && (
                                <button onClick={onInsert} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-1">
                                    {aiArticle ? 'Wstaw artykuł + pola SEO' : 'Wstaw do edytora'}
                                </button>
                            )}
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 prose prose-sm max-w-none max-h-[50vh] overflow-y-auto
                            [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-slate-800
                            [&>h3]:text-base [&>h3]:font-semibold
                            [&>p]:text-slate-600 [&>p]:text-sm
                            [&>ul]:text-sm [&>ol]:text-sm"
                            dangerouslySetInnerHTML={{ __html: aiResult }}
                        />
                        <button onClick={() => { navigator.clipboard.writeText(aiResult); toast.success('Skopiowano do schowka'); }}
                            className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                            Kopiuj do schowka
                        </button>
                    </div>
                )}
            </div>
        </div>
    </>
);

export default BlogDEPage;
