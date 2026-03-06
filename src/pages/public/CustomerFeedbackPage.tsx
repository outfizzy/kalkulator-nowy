import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FeedbackService } from '../../services/database/feedback.service';

const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJDVcmY8JiaKYRBLhEZMQJQZc';

const CATEGORIES = [
    { key: 'service', label: 'Kundenbetreuung', sublabel: 'Beratung & Kommunikation', icon: '💬' },
    { key: 'production', label: 'Wartezeit & Lieferung', sublabel: 'Produktion & Termintreue', icon: '📦' },
    { key: 'installation', label: 'Montage', sublabel: 'Qualität & Sauberkeit', icon: '🔧' },
    { key: 'overall', label: 'Gesamtbewertung', sublabel: 'Ihr Gesamteindruck', icon: '⭐' },
] as const;

const StarRating: React.FC<{
    value: number;
    onChange: (v: number) => void;
    size?: 'md' | 'lg';
}> = ({ value, onChange, size = 'md' }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className={`transition-all duration-200 transform ${(hover || value) >= star
                            ? 'text-amber-400 scale-110'
                            : 'text-gray-300 hover:text-amber-200'
                        }`}
                    style={{
                        width: size === 'lg' ? '44px' : '36px',
                        height: size === 'lg' ? '44px' : '36px',
                        // Better touch target for mobile
                        minWidth: '36px',
                        minHeight: '36px',
                        padding: '2px',
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </button>
            ))}
        </div>
    );
};

const CustomerFeedbackPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [step, setStep] = useState<'loading' | 'form' | 'success' | 'already' | 'error'>('loading');
    const [customerName, setCustomerName] = useState('');
    const [ratings, setRatings] = useState({ service: 0, production: 0, installation: 0, overall: 0 });
    const [comment, setComment] = useState('');
    const [highlights, setHighlights] = useState('');
    const [improvements, setImprovements] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) { setStep('error'); return; }
        FeedbackService.getFeedbackByToken(token).then(fb => {
            if (!fb) { setStep('error'); return; }
            if (fb.submittedAt) { setStep('already'); return; }
            setCustomerName(fb.customerName || '');
            setStep('form');
        }).catch(() => setStep('error'));
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || ratings.overall === 0) return;
        setSubmitting(true);
        try {
            await FeedbackService.submitFeedback(token, {
                ratingOverall: ratings.overall,
                ratingService: ratings.service || ratings.overall,
                ratingProduction: ratings.production || ratings.overall,
                ratingInstallation: ratings.installation || ratings.overall,
                commentDe: comment || undefined,
                highlights: highlights || undefined,
                improvements: improvements || undefined,
            });
            setStep('success');
        } catch {
            alert('Ein Fehler ist aufgetreten.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleRedirect = () => {
        if (token) FeedbackService.markGoogleRedirected(token);
        window.open(GOOGLE_REVIEW_URL, '_blank');
    };

    // --- LOADING ---
    if (step === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // --- ERROR ---
    if (step === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
                    <div className="text-5xl mb-4">😕</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Link ungültig</h2>
                    <p className="text-gray-500 text-sm">Dieser Feedback-Link ist ungültig oder abgelaufen.</p>
                </div>
            </div>
        );
    }

    // --- ALREADY SUBMITTED ---
    if (step === 'already') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Bereits eingereicht</h2>
                    <p className="text-gray-500 text-sm">Vielen Dank! Ihr Feedback wurde bereits übermittelt.</p>
                </div>
            </div>
        );
    }

    // --- SUCCESS ---
    if (step === 'success') {
        const showGoogle = ratings.overall >= 4;
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-lg w-full">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 sm:p-8 text-white text-center">
                        <div className="text-5xl mb-3">🎉</div>
                        <h2 className="text-xl sm:text-2xl font-bold">
                            Vielen Dank{customerName ? `, ${customerName.split(' ')[0]}` : ''}!
                        </h2>
                        <p className="text-emerald-100 mt-2 text-sm">Ihr Feedback hilft uns, noch besser zu werden.</p>
                    </div>
                    <div className="p-6 sm:p-8 text-center">
                        {showGoogle ? (
                            <>
                                <p className="text-gray-700 mb-2 font-medium text-sm sm:text-base">
                                    Wir freuen uns riesig über Ihre positive Bewertung! 🙏
                                </p>
                                <p className="text-gray-500 text-xs sm:text-sm mb-6">
                                    Würden Sie uns auch auf Google bewerten? Das hilft anderen Kunden bei ihrer Entscheidung.
                                </p>
                                <button
                                    onClick={handleGoogleRedirect}
                                    className="inline-flex items-center gap-3 bg-white border-2 border-blue-500 text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                                >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Auf Google bewerten
                                </button>
                                <p className="text-xs text-gray-400 mt-4">
                                    Sie werden zu Google weitergeleitet
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-700 mb-2 font-medium text-sm sm:text-base">
                                    Wir nehmen Ihr Feedback sehr ernst und arbeiten kontinuierlich daran, unseren Service zu verbessern.
                                </p>
                                <p className="text-gray-500 text-xs sm:text-sm">
                                    Vielen Dank für Ihre Ehrlichkeit — das hilft uns, besser zu werden! 💪
                                </p>
                            </>
                        )}
                    </div>
                </div>
                <div className="mt-6 text-center text-gray-400 text-xs sm:text-sm">
                    &copy; {new Date().getFullYear()} Polendach24
                </div>
            </div>
        );
    }

    // --- FORM ---
    const allRated = ratings.overall > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-start sm:justify-center py-4 sm:py-8 px-3 sm:px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-lg">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-5 sm:py-6 text-white text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <img
                            src="https://polendach24.app/logo-polendach.png"
                            alt="Polendach24"
                            className="h-7 sm:h-8 brightness-0 invert"
                            onError={e => (e.currentTarget.style.display = 'none')}
                        />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold">Wie war Ihre Erfahrung?</h1>
                    <p className="text-blue-200 mt-1 text-xs sm:text-sm">
                        {customerName ? `Hallo ${customerName.split(' ')[0]}, w` : 'W'}ir würden uns über Ihr ehrliches Feedback freuen.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-5">
                    {/* Category ratings — stacked on mobile, side-by-side on desktop */}
                    {CATEGORIES.map(cat => (
                        <div
                            key={cat.key}
                            className={`p-3 sm:p-4 rounded-xl border transition-colors ${ratings[cat.key] > 0
                                    ? 'bg-blue-50/50 border-blue-200'
                                    : 'bg-gray-50 border-gray-100 hover:border-blue-200'
                                } ${cat.key === 'overall' ? 'ring-1 ring-blue-100 bg-blue-50/70' : ''}`}
                        >
                            {/* Mobile: stacked layout, Desktop: side-by-side */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xl sm:text-2xl">{cat.icon}</span>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{cat.label}</p>
                                        <p className="text-[11px] sm:text-xs text-gray-400">{cat.sublabel}</p>
                                    </div>
                                </div>
                                <div className="flex justify-center sm:justify-end">
                                    <StarRating
                                        value={ratings[cat.key]}
                                        onChange={v => setRatings(prev => ({ ...prev, [cat.key]: v }))}
                                        size={cat.key === 'overall' ? 'lg' : 'md'}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Text feedback */}
                    <div className="space-y-3 sm:space-y-4 pt-1">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                💚 Was hat Ihnen besonders gefallen?
                            </label>
                            <textarea
                                rows={2}
                                placeholder="z.B. schnelle Kommunikation, pünktliche Montage..."
                                className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                                value={highlights}
                                onChange={e => setHighlights(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                💡 Was können wir verbessern?
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Ihre Vorschläge helfen uns, besser zu werden..."
                                className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                                value={improvements}
                                onChange={e => setImprovements(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                📝 Zusätzlicher Kommentar <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Möchten Sie uns noch etwas mitteilen?"
                                className="w-full px-3 sm:px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!allRated || submitting}
                        className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-white transition-all shadow-lg text-sm sm:text-base ${allRated
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0'
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Wird gesendet...
                            </span>
                        ) : (
                            'Feedback absenden'
                        )}
                    </button>

                    {!allRated && (
                        <p className="text-center text-xs text-gray-400">
                            Bitte vergeben Sie mindestens die Gesamtbewertung ⭐
                        </p>
                    )}
                </form>
            </div>

            <div className="mt-4 sm:mt-6 text-center text-gray-400 text-xs">
                &copy; {new Date().getFullYear()} Polendach24. Ihre Daten werden vertraulich behandelt.
            </div>
        </div>
    );
};

export default CustomerFeedbackPage;
