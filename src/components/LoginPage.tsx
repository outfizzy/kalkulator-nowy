import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// reCAPTCHA Enterprise type declarations
declare global {
  interface Window {
    grecaptcha?: {
      enterprise: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

const RECAPTCHA_SITE_KEY = '6LeUWpAsAAAAAOy47DBuWpMAY1sAo3VO7O5D5KNl';
// ============================================================================
// SVG Icon components — professional & consistent
// ============================================================================
const Icon = {
    Tag: (p: React.SVGProps<SVGSVGElement>) => (
        <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.844.844 2.212.844 3.056 0l4.454-4.454c.844-.844.844-2.212 0-3.056l-9.581-9.581A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
    ),
    CreditCard: (p: React.SVGProps<SVGSVGElement>) => (
        <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
    ),
    Ruler: (p: React.SVGProps<SVGSVGElement>) => (
        <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.745 3A23.933 23.933 0 003 12c0 3.183.62 6.22 1.745 9M19.5 3c.967 2.78 1.5 5.817 1.5 9s-.533 6.22-1.5 9M8.25 8.885l1.444-.89a.75.75 0 011.105.402l2.402 7.206a.75.75 0 00.711.513h2.088" /></svg>
    ),
    ClipboardList: (p: React.SVGProps<SVGSVGElement>) => (
        <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
    ),
    Chart: (p: React.SVGProps<SVGSVGElement>) => (
        <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
    ),
    Headset: (p: React.SVGProps<SVGSVGElement>) => (
        <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
    ),
    Calculator: (p: React.SVGProps<SVGSVGElement>) => (
        <svg {...p} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" /></svg>
    ),
};

// ============================================================================
// Product showcase data
// ============================================================================
const PRODUCT_SHOWCASE: { name: string; subtitle?: string; image: string; tag: string; spec: string; description: string; features: string[] }[] = [
    {
        name: 'Skystyle',
        image: '/images/models/skyline.jpg',
        tag: 'Dach horyzontalny',
        spec: 'Do 7000 × 5000 mm',
        description: 'Nowoczesny dach horyzontalny o smukłej, kubistycznej konstrukcji. Idealny do rozbudowy o pokój ogrodowy.',
        features: ['Szkło VSG 8–10 mm', 'LED-Spots w belkach', 'Szkło refleksyjne opcjonalnie'],
    },
    {
        name: 'Ultrastyle',
        subtitle: 'Premium',
        image: '/images/models/ultraline.jpg',
        tag: 'Dach lamelowy',
        spec: 'Do 7000 mm bez słupa',
        description: 'Flagowy model z bioklimatycznymi lamelami. Jedno zadaszenie, trzy warianty designu — elegancki, minimalistyczny lub solidny.',
        features: ['Ruchome lamele aluminiowe', 'Wbudowany system odwodnienia', 'Zintegrowane oświetlenie LED'],
    },
    {
        name: 'Topstyle',
        image: '/images/models/topline.jpg',
        tag: 'Zadaszenie tarasowe',
        spec: 'Do 7000 × 4000 mm (XL)',
        description: 'Klasyczne zadaszenie ze skośnym dachem i niezwykłą wytrzymałością. Wariant XL oferuje wyjątkowo duże rozpiętości.',
        features: ['Nachylenie dachu 5–15°', 'VSG lub poliwęglan 16 mm', 'Klasy śniegowe i wiatrowe'],
    },
    {
        name: 'Trendstyle',
        subtitle: 'Basic',
        image: '/images/models/trendline.jpg',
        tag: 'Zadaszenie tarasowe',
        spec: 'Do 6000 × 3000 mm',
        description: 'Zrównoważone i trwałe zadaszenie dla indywidualistów. Trzy warianty stylu: flat, round i classic.',
        features: ['3 profile stylowe', 'Regulowane profile kątowe', 'Atrakcyjna cena'],
    },
    {
        name: 'Carport',
        image: '/images/models/carport-4.jpg',
        tag: 'Wiata garażowa',
        spec: 'Do 7000 × 5000 mm',
        description: 'Aluminiowa wiata o smukłej budowie z dachem z blachy trapezowej. Chroni przed deszczem, śniegiem i UV.',
        features: ['Gotowy pod panele solarne', 'Włóknina antykondensacyjna', 'Wariant na 1–2 stanowiska'],
    },
    {
        name: 'Pergola Deluxe',
        image: '/images/models/pergola-deluxe.jpg',
        tag: 'Cabrio-effect dach',
        spec: 'Otwierany szklany dach',
        description: 'Pergola z efektem Cabrio — dach otwierany automatycznie, dający pełną kontrolę nad światłem i powietrzem.',
        features: ['Cabrio Effect', 'Zautomatyzowane otwieranie', 'Szklane panele przesuwne'],
    },
];

// Benefit definitions with SVG icons — compact labels
const BENEFITS = [
    { icon: Icon.Tag, title: 'Ceny hurtowe' },
    { icon: Icon.CreditCard, title: 'Kredyt kupiecki' },
    { icon: Icon.Ruler, title: 'Doradztwo techniczne' },
    { icon: Icon.ClipboardList, title: 'Obsługa zleceń' },
    { icon: Icon.Chart, title: 'Panel analityczny' },
    { icon: Icon.Headset, title: 'Wsparcie handlowe' },
    { icon: Icon.Calculator, title: 'Statyka modeli' },
];

// ============================================================================
// LoginPage — Premium landing with product showcase
// ============================================================================
export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [honeypot, setHoneypot] = useState('');
    const startTime = React.useRef(Date.now());

    const [loginMode, setLoginMode] = useState<'b2b' | 'sales'>('b2b');

    // Product carousel
    const [activeProduct, setActiveProduct] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveProduct(p => (p + 1) % PRODUCT_SHOWCASE.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Animated counters
    const [counters, setCounters] = useState({ models: 0, colors: 0, projects: 0 });
    useEffect(() => {
        const targets = { models: 40, colors: 200, projects: 600 };
        const duration = 2000;
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const p = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCounters({
                models: Math.round(targets.models * ease),
                colors: Math.round(targets.colors * ease),
                projects: Math.round(targets.projects * ease),
            });
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, []);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (honeypot) return;
        if (Date.now() - startTime.current < 1000) return;

        setLoading(true);
        try {
            // reCAPTCHA Enterprise verification
            if (!window.grecaptcha?.enterprise) {
                toast.error('Weryfikacja reCAPTCHA niedostępna. Odśwież stronę.');
                setLoading(false);
                return;
            }

            const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, {
                action: loginMode === 'b2b' ? 'login_b2b' : 'login_sales',
            });

            if (!token) {
                toast.error('Weryfikacja reCAPTCHA nie powiodła się.');
                setLoading(false);
                return;
            }

            const { error, user } = await login(email, password);
            if (error) throw error;
            if (user?.role === 'partner' || user?.role === 'b2b_partner') {
                navigate('/b2b/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (error: unknown) {
            const rawError = (error as any)?.message || (error as any)?.error_description || 'Błąd logowania';
            toast.error(rawError);
        } finally {
            setLoading(false);
        }
    };

    const currentProduct = PRODUCT_SHOWCASE[activeProduct];

    return (
        <div className="min-h-screen lg:h-screen bg-[#080d16] flex flex-col lg:flex-row overflow-hidden relative">
            {/* Ambient effects */}
            <div className="absolute top-[-200px] left-[10%] w-[700px] h-[700px] bg-emerald-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-100px] right-[15%] w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

            {/* ════════════════════════════════════════════ */}
            {/* LEFT: B2B Partner Hub                        */}
            {/* ════════════════════════════════════════════ */}
            <div className="w-full lg:w-[58%] relative flex flex-col p-6 lg:px-8 lg:py-5 xl:px-12 xl:py-6 overflow-y-auto">
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }} />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-4 lg:mb-4">
                    <img src="/logo.png" alt="PolenDach 24" className="h-9 lg:h-11 w-auto brightness-0 invert opacity-90" />
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-xs text-emerald-400/70 font-medium">System online</span>
                    </div>
                </div>

                {/* Hero */}
                <div className="relative z-10 flex-grow flex flex-col justify-center max-w-2xl">
                    <div className="inline-flex items-center self-start px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 backdrop-blur-sm mb-3">
                        <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        <span className="text-sm text-emerald-400/90 font-medium">Rejestracja otwarta — dołącz do programu partnerskiego</span>
                    </div>

                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-2 leading-[1.08] tracking-tight">
                        Platforma<br/>
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                            Partnerska B2B
                        </span>
                    </h1>
                    <p className="text-sm lg:text-base text-slate-400 leading-relaxed max-w-xl mb-3">
                        Zadaszenia aluminiowe premium — pergole, carporty i systemy ZIP.
                        Dołącz do programu partnerskiego i sprzedawaj z najlepszymi cenami na rynku.
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-6 lg:gap-10 mb-3">
                        <StatCounter value={`${counters.models}+`} label="Modeli" />
                        <div className="w-px h-10 bg-slate-700/30" />
                        <StatCounter value={`${counters.colors}+`} label="Kolorów RAL" />
                        <div className="w-px h-10 bg-slate-700/30" />
                        <StatCounter value={`${counters.projects}+`} label="Realizacji" />
                    </div>

                    {/* ═══ PRODUCT SHOWCASE ═══ */}
                    <div className="mb-3">
                        <div className="relative aspect-[16/7] rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/40 group">
                            {PRODUCT_SHOWCASE.map((product, i) => (
                                <div key={product.name}
                                    className="absolute inset-0 transition-all duration-700 ease-in-out"
                                    style={{ opacity: i === activeProduct ? 1 : 0, transform: i === activeProduct ? 'scale(1)' : 'scale(1.05)' }}>
                                    <img src={product.image} alt={product.name}
                                        className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                </div>
                            ))}
                            {/* Product info overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4 z-10">
                                <div className="flex items-end justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-[10px] text-white/70 font-medium uppercase tracking-wider border border-white/10">
                                            {currentProduct.tag}
                                        </span>
                                        <h3 className="text-xl lg:text-2xl font-black text-white mt-1">
                                            {currentProduct.name}
                                            {currentProduct.subtitle && <span className="text-emerald-400 ml-1.5 text-base font-bold">{currentProduct.subtitle}</span>}
                                        </h3>
                                        <p className="text-[11px] text-white/60 mt-0.5 leading-snug line-clamp-2">{currentProduct.description}</p>
                                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                            <span className="text-[10px] text-emerald-400/90 font-semibold">{currentProduct.spec}</span>
                                            <span className="text-white/20">·</span>
                                            {currentProduct.features.map(f => (
                                                <span key={f} className="px-2 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-sm text-[9px] text-white/60 font-medium border border-white/[0.06]">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-xs text-white/40 flex-shrink-0">{activeProduct + 1}/{PRODUCT_SHOWCASE.length}</div>
                                </div>
                            </div>
                        </div>

                        {/* Carousel dots */}
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                            {PRODUCT_SHOWCASE.map((_, i) => (
                                <button key={i} onClick={() => setActiveProduct(i)}
                                    className={`transition-all duration-300 rounded-full ${i === activeProduct ? 'w-6 h-1.5 bg-emerald-400' : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-600'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Benefits — compact icon pills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {BENEFITS.map(b => (
                            <BenefitPill key={b.title} IconComponent={b.icon} title={b.title} />
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={() => navigate('/partner/register')}
                            className="group px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all duration-300 shadow-xl shadow-emerald-600/15 hover:shadow-emerald-500/25 text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]">
                            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                            Zarejestruj firmę
                        </button>
                        <button onClick={() => setLoginMode('b2b')}
                            className="px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-white font-medium rounded-xl transition-all border border-white/[0.06] hover:border-white/[0.12] backdrop-blur-sm flex items-center justify-center gap-2 active:scale-[0.98] text-sm">
                            Mam konto B2B →
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 pt-2 border-t border-white/[0.04] mt-3">
                    <p className="text-slate-600 text-xs">© 2026 Polendach24 s.c. · <a href="mailto:buero@polendach24.de" className="text-slate-500 hover:text-emerald-400 transition-colors">buero@polendach24.de</a></p>
                </div>
            </div>

            {/* ════════════════════════════════════════════ */}
            {/* RIGHT: Login panels                         */}
            {/* ════════════════════════════════════════════ */}
            <div className="w-full lg:w-[42%] flex flex-col p-6 lg:p-8 xl:p-10 bg-[#0c1220] border-l border-white/[0.04]">
                <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full gap-5">

                    {/* Mode switcher */}
                    <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
                        <button onClick={() => setLoginMode('b2b')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${loginMode === 'b2b'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'text-slate-500 hover:text-slate-300'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
                            Partner B2B
                        </button>
                        <button onClick={() => setLoginMode('sales')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${loginMode === 'sales'
                                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                                : 'text-slate-500 hover:text-slate-300'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                            Przedstawiciel
                        </button>
                    </div>

                    {/* ═══ B2B LOGIN ═══ */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${loginMode === 'b2b' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.02] backdrop-blur-xl rounded-2xl border border-emerald-500/10 p-6 shadow-2xl shadow-black/20">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/10">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Strefa Partnera B2B</h2>
                                    <p className="text-xs text-slate-500">Panel hurtowy — zaloguj się do konta firmowego</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="hidden"><input type="text" name="website_url" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Adres email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                        className="w-full px-3.5 py-2.5 bg-black/30 border border-emerald-500/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/20 transition-all text-sm"
                                        placeholder="biuro@twojafirma.pl" disabled={loading} autoComplete="email" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Hasło</label>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                                        className="w-full px-3.5 py-2.5 bg-black/30 border border-emerald-500/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/20 transition-all text-sm"
                                        placeholder="••••••••" disabled={loading} />
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg border border-emerald-500/10">
                                    <svg className="w-4 h-4 text-emerald-400/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    <span className="text-[11px] text-slate-500">Chronione przez reCAPTCHA Enterprise</span>
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/15 text-sm active:scale-[0.98]">
                                    {loading ? <Spinner /> : 'Zaloguj się do panelu B2B'}
                                </button>
                            </form>
                            <div className="mt-4 pt-3 border-t border-emerald-500/10 text-center">
                                <button onClick={() => navigate('/partner/register')}
                                    className="text-emerald-400/80 hover:text-emerald-400 text-sm font-medium transition-colors">
                                    Nie masz konta? <span className="underline underline-offset-2">Zarejestruj firmę</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══ SALES REP LOGIN ═══ */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${loginMode === 'sales' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-6 shadow-2xl shadow-black/20">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/10">
                                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Panel Przedstawiciela</h2>
                                    <p className="text-xs text-slate-500">System ofertowo-sprzedażowy dla handlowców</p>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="hidden"><input type="text" name="website_url_2" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Email lub Login</label>
                                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required
                                        className="w-full px-3.5 py-2.5 bg-black/30 border border-slate-600/40 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all text-sm"
                                        placeholder="email@polendach24.de" disabled={loading} autoComplete="username" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Hasło</label>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                                        className="w-full px-3.5 py-2.5 bg-black/30 border border-slate-600/40 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all text-sm"
                                        placeholder="••••••••" disabled={loading} />
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-black/20 rounded-lg border border-slate-600/20">
                                    <svg className="w-4 h-4 text-accent/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    <span className="text-[11px] text-slate-500">Chronione przez reCAPTCHA Enterprise</span>
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full text-white font-semibold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 shadow-lg bg-accent hover:bg-accent/90 shadow-accent/15 text-sm active:scale-[0.98]">
                                    {loading ? <Spinner /> : 'Zaloguj się'}
                                </button>
                            </form>
                            <div className="mt-4 pt-3 border-t border-slate-700/20 flex flex-wrap gap-1.5">
                                {[
                                    { icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, label: 'Oferty' },
                                    { icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>, label: 'AI' },
                                    { icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5z" /></svg>, label: 'Kalkulacje' },
                                    { icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>, label: 'Kalendarz' },
                                ].map(f => (
                                    <span key={f.label} className="px-2.5 py-1 rounded-md bg-black/20 text-[11px] text-slate-500 border border-slate-700/20 flex items-center gap-1.5">
                                        {f.icon}
                                        {f.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Kundenportal — ukryty, do wdrożenia Q2 2026 */}

                    <div className="flex items-center justify-center gap-5 text-xs text-slate-600 pt-3">
                        <a href="mailto:buero@polendach24.de" className="hover:text-slate-400 transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                            Kontakt
                        </a>
                        <span className="text-slate-700">·</span>
                        <span>v4.2</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
const Spinner: React.FC = () => (
    <span className="flex items-center justify-center gap-2">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        Logowanie...
    </span>
);

const StatCounter: React.FC<{ value: string; label: string; sublabel?: string }> = ({ value, label, sublabel }) => (
    <div>
        <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">{value}</div>
        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</div>
        {sublabel && <div className="text-[10px] text-slate-600 font-medium">{sublabel}</div>}
    </div>
);

const BenefitPill: React.FC<{
    IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    title: string;
}> = ({ IconComponent, title }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group cursor-default">
        <IconComponent className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
        <span className="text-xs text-slate-300/80 font-medium whitespace-nowrap">{title}</span>
    </div>
);

export default LoginPage;
