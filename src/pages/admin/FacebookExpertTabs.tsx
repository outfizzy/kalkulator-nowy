import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FacebookService, type FBTemplate } from '../../services/database/facebook.service';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// CONTENT STUDIO TAB — Expert AI Copywriting
// ═══════════════════════════════════════════

export function ContentStudioTab() {
    const [templates, setTemplates] = useState<FBTemplate[]>([]);
    const [selected, setSelected] = useState<FBTemplate | null>(null);
    const [vars, setVars] = useState<Record<string, string>>({});
    const [result, setResult] = useState('');
    const [generating, setGenerating] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [copied, setCopied] = useState(false);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => { FacebookService.getTemplates().then(setTemplates).catch(() => {}); }, []);

    const categories = [
        { id: 'all', label: 'Alle', icon: '📋' },
        { id: 'realization', label: 'Realizacje', icon: '🏗️' },
        { id: 'seasonal', label: 'Sezonowe', icon: '🌸' },
        { id: 'testimonial', label: 'Opinie', icon: '⭐' },
        { id: 'educational', label: 'Edukacyjne', icon: '📚' },
        { id: 'promotion', label: 'Promocje', icon: '🔥' },
        { id: 'behind_scenes', label: 'Za kulisami', icon: '🔧' },
        { id: 'engagement', label: 'Interakcje', icon: '📊' },
        { id: 'inspiration', label: 'Inspiracja', icon: '💡' },
    ];

    const filtered = activeCategory === 'all' ? templates : templates.filter(t => t.category === activeCategory);

    const handleGenerate = async () => {
        if (!selected) return;
        setGenerating(true);
        try {
            let context = `Post-Typ: ${selected.name}\nKategorie: ${selected.category}`;
            const varsStr = Object.entries(vars).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
            if (varsStr) context += `\nDetails: ${varsStr}`;

            const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
                body: { analysisType: 'fb_post_generator', businessData: context }
            });
            if (error) throw error;
            const content = (data.content || data.analysis || '').trim()
                .replace(/^#+\s.*$/gm, '').replace(/^---.*$/gm, '').replace(/^\*.*Powered by Claude\*$/gm, '').replace(/^\[.*\]$/gm, '').trim();
            setResult(content || data.content);
            toast.success('🤖 Post wygenerowany przez AI Copywriter!');
        } catch (err: any) { toast.error(err.message); }
        finally { setGenerating(false); }
    };

    const handlePublish = async () => {
        if (!result) return;
        setPublishing(true);
        try {
            await FacebookService.publishPost({ message: result });
            await FacebookService.saveLocalPost({ content: result, media_urls: [], post_type: 'text', status: 'published', published_at: new Date().toISOString() });
            toast.success('✅ Post opublikowany!');
            setResult('');
        } catch (err: any) { toast.error(err.message); }
        finally { setPublishing(false); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">✨ Kreativ-Studio</h2>
                <p className="text-violet-200 text-sm mt-1">Professioneller KI-Content-Generator für die deutsche Überdachungsbranche</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                    <button key={c.id} onClick={() => setActiveCategory(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === c.id ? 'bg-violet-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'}`}
                    >{c.icon} {c.label}</button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Templates list */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-700">📋 Szablony ({filtered.length})</h3>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                        {filtered.map(t => (
                            <button key={t.id} onClick={() => { setSelected(t); setVars({}); setResult(''); }}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === t.id ? 'border-violet-400 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-200 hover:shadow-sm'}`}>
                                <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase">{t.category}</p>
                                {t.variables?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {t.variables.map(v => <span key={v} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500">{v}</span>)}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="space-y-4">
                    {selected ? (
                        <>
                            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                                <h3 className="font-bold text-slate-800">{selected.name}</h3>
                                {selected.variables?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-slate-500">Wypełnij dane:</p>
                                        {selected.variables.map(v => (
                                            <div key={v}>
                                                <label className="text-[10px] font-bold text-violet-600 uppercase">{v.replace(/_/g, ' ')}</label>
                                                <input value={vars[v] || ''} onChange={e => setVars(p => ({ ...p, [v]: e.target.value }))}
                                                    placeholder={`Wpisz ${v.replace(/_/g, ' ')}...`}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none mt-0.5" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button onClick={handleGenerate} disabled={generating}
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-bold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {generating ? <>⏳ Generuję...</> : <>🤖 Generuj z AI</>}
                                </button>
                                {selected.example_output && !result && (
                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                        <p className="text-[10px] font-bold text-amber-700 mb-1">💡 PRZYKŁAD WYNIKU:</p>
                                        <p className="text-xs text-amber-900 whitespace-pre-wrap">{selected.example_output}</p>
                                    </div>
                                )}
                            </div>

                            {result && (
                                <div className="bg-white rounded-xl border-2 border-green-300 p-5 space-y-3">
                                    <p className="text-xs font-bold text-green-700">✅ WYGENEROWANA TREŚĆ:</p>
                                    <div className="bg-white rounded-lg p-4 shadow border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">P</div>
                                            <div><p className="text-sm font-bold text-slate-800">Polendach24</p><p className="text-[10px] text-slate-400">Gerade eben · 🌍</p></div>
                                        </div>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result}</p>
                                    </div>
                                    <textarea value={result} onChange={e => setResult(e.target.value)} rows={8}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
                                    <div className="flex gap-2">
                                        <button onClick={handlePublish} disabled={publishing} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm">
                                            {publishing ? 'Publikuję...' : '🚀 Opublikuj na FB'}
                                        </button>
                                        <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 text-sm">
                                            {copied ? '✅' : '📋'} Kopiuj
                                        </button>
                                        <button onClick={() => { FacebookService.saveLocalPost({ content: result, media_urls: [], post_type: 'text', status: 'draft' }); toast.success('💾 Szkic zapisany'); }}
                                            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 text-sm">💾</button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                            <p className="text-4xl mb-3">👈</p>
                            <p className="text-slate-500 font-medium">Wybierz szablon z lewej strony</p>
                            <p className="text-xs text-slate-400 mt-1">12 profesjonalnych szablonów dla branży zadaszeń</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
