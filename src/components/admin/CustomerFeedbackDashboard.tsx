import React, { useState, useEffect, useMemo } from 'react';
import { FeedbackService, type CustomerFeedback } from '../../services/database/feedback.service';
import { toast } from 'react-hot-toast';

const formatDate = (d?: Date) => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

const Stars: React.FC<{ value: number; size?: string }> = ({ value, size = 'w-4 h-4' }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
            <svg key={s} className={`${size} ${s <= value ? 'text-amber-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
        ))}
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Oczekuje' },
        submitted: { bg: 'bg-green-50', text: 'text-green-700', label: 'Wypełniony' },
        google_redirected: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Google ⭐' },
    };
    const c = cfg[status] || cfg.pending;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
};

export const CustomerFeedbackDashboard: React.FC = () => {
    const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [translationText, setTranslationText] = useState('');

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        setLoading(true);
        try {
            const data = await FeedbackService.getAllFeedback();
            setFeedback(data);
        } catch (err) {
            console.error(err);
            toast.error('Błąd ładowania feedbacku');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        if (filter === 'submitted') return feedback.filter(f => f.submittedAt);
        if (filter === 'pending') return feedback.filter(f => !f.submittedAt);
        return feedback;
    }, [feedback, filter]);

    const stats = useMemo(() => {
        const submitted = feedback.filter(f => f.submittedAt);
        const withRating = submitted.filter(f => f.ratingOverall);
        const avg = (vals: (number | undefined)[]) => {
            const valid = vals.filter((v): v is number => v !== undefined && v !== null);
            return valid.length ? Math.round((valid.reduce((s, n) => s + n, 0) / valid.length) * 10) / 10 : 0;
        };
        return {
            total: feedback.length,
            submitted: submitted.length,
            pending: feedback.length - submitted.length,
            avgOverall: avg(withRating.map(f => f.ratingOverall)),
            avgService: avg(withRating.map(f => f.ratingService)),
            avgProduction: avg(withRating.map(f => f.ratingProduction)),
            avgInstallation: avg(withRating.map(f => f.ratingInstallation)),
            fiveStar: withRating.filter(f => f.ratingOverall === 5).length,
            googleRedirects: feedback.filter(f => f.googleRedirected).length,
        };
    }, [feedback]);

    const handleSaveTranslation = async (id: string) => {
        try {
            await FeedbackService.updateTranslation(id, translationText);
            toast.success('Tłumaczenie zapisane');
            setEditingId(null);
            loadFeedback();
        } catch {
            toast.error('Błąd zapisu');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Kundenfeedback</h2>
                        <p className="text-sm text-slate-500">Opinie klientów po montażu</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {([['all', 'Wszystkie'], ['submitted', 'Wypełnione'], ['pending', 'Oczekujące']] as const).map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setFilter(id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Wysłanych</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Wypełnionych</p>
                    <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{stats.total > 0 ? Math.round(stats.submitted / stats.total * 100) : 0}% response rate</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Średnia ocena</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-amber-500">{stats.avgOverall}</p>
                        <Stars value={Math.round(stats.avgOverall)} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">5 gwiazdek ⭐</p>
                    <p className="text-2xl font-bold text-indigo-600">{stats.fiveStar}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Google Redirect</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.googleRedirects}</p>
                </div>
            </div>

            {/* Category averages */}
            {stats.submitted > 0 && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Średnie oceny wg kategorii</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Obsługa klienta', value: stats.avgService, icon: '💬' },
                            { label: 'Czas oczekiwania', value: stats.avgProduction, icon: '📦' },
                            { label: 'Montaż', value: stats.avgInstallation, icon: '🔧' },
                            { label: 'Ogólna', value: stats.avgOverall, icon: '⭐' },
                        ].map(cat => (
                            <div key={cat.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <span className="text-xl">{cat.icon}</span>
                                <div>
                                    <p className="text-xs text-slate-500">{cat.label}</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-800">{cat.value}</span>
                                        <Stars value={Math.round(cat.value)} size="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Feedback list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            <p className="text-3xl mb-2">📭</p>
                            <p>Brak feedbacków do wyświetlenia</p>
                        </div>
                    )}
                    {filtered.map(fb => (
                        <div key={fb.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-slate-800">{fb.customerName || 'Bez nazwy'}</h4>
                                        <StatusBadge status={fb.status} />
                                        {fb.googleRedirected && <span className="text-xs text-blue-500">🔗 Google</span>}
                                    </div>
                                    <p className="text-xs text-slate-400">{fb.customerEmail} · Wysłano: {formatDate(fb.sentAt)} · Odpowiedź: {formatDate(fb.submittedAt)}</p>
                                </div>
                                {fb.ratingOverall && (
                                    <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">
                                        <span className="text-lg font-bold text-amber-600">{fb.ratingOverall}</span>
                                        <Stars value={fb.ratingOverall} />
                                    </div>
                                )}
                            </div>

                            {fb.submittedAt && (
                                <>
                                    {/* Category ratings */}
                                    <div className="flex flex-wrap gap-4 mb-3">
                                        {[
                                            { label: 'Obsługa', value: fb.ratingService },
                                            { label: 'Oczekiwanie', value: fb.ratingProduction },
                                            { label: 'Montaż', value: fb.ratingInstallation },
                                        ].map(r => r.value && (
                                            <div key={r.label} className="flex items-center gap-1.5 text-xs">
                                                <span className="text-slate-500">{r.label}:</span>
                                                <Stars value={r.value} size="w-3 h-3" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Highlights & Improvements */}
                                    {(fb.highlights || fb.improvements) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            {fb.highlights && (
                                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">💚 Co się podobało (DE)</p>
                                                    <p className="text-sm text-green-800">{fb.highlights}</p>
                                                </div>
                                            )}
                                            {fb.improvements && (
                                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">💡 Do poprawy (DE)</p>
                                                    <p className="text-sm text-amber-800">{fb.improvements}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Comment DE + PL */}
                                    {fb.commentDe && (
                                        <div className="space-y-2 mb-3">
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">🇩🇪 Komentarz (oryginał)</p>
                                                <p className="text-sm text-slate-700">{fb.commentDe}</p>
                                            </div>
                                            {fb.commentPl && (
                                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">🇵🇱 Tłumaczenie PL</p>
                                                    <p className="text-sm text-blue-800">{fb.commentPl}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Translation button */}
                                    {editingId === fb.id ? (
                                        <div className="flex gap-2 items-end">
                                            <textarea
                                                value={translationText}
                                                onChange={e => setTranslationText(e.target.value)}
                                                placeholder="Wpisz tłumaczenie po polsku..."
                                                rows={2}
                                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                            />
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleSaveTranslation(fb.id)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                                                >
                                                    Zapisz
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs hover:bg-slate-50"
                                                >
                                                    Anuluj
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setEditingId(fb.id); setTranslationText(fb.commentPl || ''); }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                        >
                                            🇵🇱 {fb.commentPl ? 'Edytuj tłumaczenie' : 'Dodaj tłumaczenie PL'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
