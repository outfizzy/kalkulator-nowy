import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FacebookService } from '../../services/database/facebook.service';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// CREATIVE LIBRARY — Ad Templates + Auto-Resize
// ═══════════════════════════════════════════

type Format = 'feed' | 'square' | 'story';
type Category = 'product' | 'testimonial' | 'promo' | 'seasonal' | 'tip' | 'behind_scenes';

interface AdTemplate {
    id: string;
    category: Category;
    name: string;
    headline: string;
    primaryText: string;
    description: string;
    ctaType: string;
    suggestedImage: string;
    colors: { bg: string; text: string; accent: string };
}

const FORMAT_SIZES: Record<Format, { w: number; h: number; label: string; desc: string; icon: string }> = {
    feed: { w: 1200, h: 630, label: 'Feed (1200×630)', desc: 'Post na tablicy', icon: '📰' },
    square: { w: 1080, h: 1080, label: 'Kwadrat (1080×1080)', desc: 'Najlepszy engagement', icon: '⬜' },
    story: { w: 1080, h: 1920, label: 'Story / Reel (1080×1920)', desc: 'Pełny ekran', icon: '📱' },
};

const CATEGORY_META: Record<Category, { icon: string; label: string; color: string }> = {
    product: { icon: '🏠', label: 'Produkt', color: 'from-blue-500 to-indigo-600' },
    testimonial: { icon: '⭐', label: 'Opinia', color: 'from-amber-500 to-orange-600' },
    promo: { icon: '🔥', label: 'Promocja', color: 'from-red-500 to-pink-600' },
    seasonal: { icon: '🌿', label: 'Sezonowy', color: 'from-green-500 to-teal-600' },
    tip: { icon: '💡', label: 'Porada', color: 'from-violet-500 to-purple-600' },
    behind_scenes: { icon: '🔧', label: 'Za kulisami', color: 'from-slate-500 to-slate-700' },
};

// Pre-built professional ad templates
const AD_TEMPLATES: AdTemplate[] = [
    // Product showcases
    {
        id: 'classic-terrace',
        category: 'product',
        name: 'Terrasse Classic',
        headline: 'Terrassenüberdachung Classic Line',
        primaryText: '☀️ Schützen Sie Ihre Terrasse — bei Sonne UND Regen!\n\n✅ Pulverbeschichtetes Aluminium\n✅ 16mm Stegplatten\n✅ Bis 7m Spannweite\n✅ Montage in 1 Tag\n\n💰 Ab 3.490 € inkl. Montage\n\n👉 Jetzt kostenlose Beratung!',
        description: 'Premium Aluminium-Terrassenüberdachung — wartungsfrei & langlebig',
        ctaType: 'LEARN_MORE',
        suggestedImage: 'Nowoczesna terrasse z aluminiowym zadaszeniem',
        colors: { bg: '#1e40af', text: '#ffffff', accent: '#fbbf24' },
    },
    {
        id: 'lamellen-pergola',
        category: 'product',
        name: 'Lamellendach Pergola',
        headline: 'Lamellendach Bio-Clima',
        primaryText: '🌬️ Das intelligente Terrassendach — verstellbare Lamellen!\n\n✅ 0° bis 150° Neigung\n✅ 100% wasserdicht\n✅ Smart-Home Integration\n✅ LED-Beleuchtung optional\n\n🎯 Die Zukunft der Überdachung!\n📞 Jetzt Angebot anfragen →',
        description: 'Bioklimatische Pergola mit verstellbaren Aluminium-Lamellen',
        ctaType: 'GET_QUOTE',
        suggestedImage: 'Bioclimatic Pergola mit Lamellen',
        colors: { bg: '#059669', text: '#ffffff', accent: '#34d399' },
    },
    {
        id: 'carport-alu',
        category: 'product',
        name: 'Carport Aluminium',
        headline: 'Aluminium-Carport Premium',
        primaryText: '🚗 Schützen Sie Ihr Auto — stilvoll & wartungsfrei!\n\n✅ Freistehend oder wandseitig\n✅ Bis zu 2 PKW Stellplätze\n✅ Schneelast bis 150 kg/m²\n✅ Keine Baugenehmigung nötig*\n\n💰 Ab 2.990 € inkl. Aufbau\n\n*In den meisten Bundesländern',
        description: 'Aluminium-Carport — elegant, robust, wartungsfrei',
        ctaType: 'LEARN_MORE',
        suggestedImage: 'Aluminium Carport mit Auto',
        colors: { bg: '#374151', text: '#ffffff', accent: '#60a5fa' },
    },
    // Testimonials
    {
        id: 'happy-customer',
        category: 'testimonial',
        name: 'Zufriedener Kunde',
        headline: '⭐⭐⭐⭐⭐ Kundenmeinung',
        primaryText: '„Wir sind absolut begeistert von unserer neuen Terrassenüberdachung! Die Montage war professionell und in nur einem Tag erledigt. Jetzt genießen wir unsere Terrasse bei jedem Wetter."\n\n— Familie [NACHNAME], [STADT]\n\n📷 Vielen Dank für das Vertrauen! 🙏\n\n👉 Sie möchten auch? Kostenlose Beratung →',
        description: 'Echte Kundenbewertung — 5 Sterne',
        ctaType: 'LEARN_MORE',
        suggestedImage: 'Glückliche Familie auf der Terrasse',
        colors: { bg: '#d97706', text: '#ffffff', accent: '#fef3c7' },
    },
    {
        id: 'before-after',
        category: 'testimonial',
        name: 'Vorher / Nachher',
        headline: 'Transformation — Vorher & Nachher',
        primaryText: '🏠 Sehen Sie den Unterschied!\n\n◀️ VORHER: Ungeschützte Terrasse, nur bei Sonnenschein nutzbar\n▶️ NACHHER: Überdachte Wohlfühloase, 365 Tage im Jahr\n\n✨ Eine Investition, die den Alltag verändert.\n\n📸 Swipe für mehr Projekte! →\n📞 Ihre Terrasse nächste?',
        description: 'Beeindruckende Vorher/Nachher Transformation',
        ctaType: 'LEARN_MORE',
        suggestedImage: 'Split-Image Vorher und Nachher',
        colors: { bg: '#7c3aed', text: '#ffffff', accent: '#c4b5fd' },
    },
    // Promos
    {
        id: 'spring-sale',
        category: 'promo',
        name: 'Frühlings-Aktion',
        headline: '🌸 FRÜHBUCHER-AKTION — Bis zu 15% Rabatt!',
        primaryText: '🔥 Nur noch bis Ende des Monats!\n\n🎁 15% Rabatt auf alle Überdachungen\n🎁 GRATIS LED-Beleuchtung (Wert: 490€)\n🎁 Kostenlose Vor-Ort-Beratung\n🎁 Festpreis-Garantie\n\n📞 Jetzt Termin sichern — begrenzte Plätze!\n⏰ Nur noch wenige Termine frei!',
        description: 'Frühbucher-Rabatt — jetzt planen, im Frühling genießen',
        ctaType: 'SIGN_UP',
        suggestedImage: 'Sale Banner z kwiatami - wiosenny',
        colors: { bg: '#dc2626', text: '#ffffff', accent: '#fef08a' },
    },
    {
        id: 'free-consultation',
        category: 'promo',
        name: 'Kostenlose Beratung',
        headline: '📋 GRATIS Beratung & 3D-Visualisierung',
        primaryText: '🏠 Wie sieht IHRE Traumterrasse aus?\n\n✅ Kostenlose Vor-Ort-Beratung\n✅ 3D-Visualisierung Ihres Projektes\n✅ Festpreis-Angebot ohne versteckte Kosten\n✅ Unverbindlich — keine Verpflichtung\n\n📞 Rufen Sie uns jetzt an!\n📱 Oder schreiben Sie uns eine Nachricht →',
        description: 'Kostenlose, unverbindliche Beratung mit 3D-Vorschau',
        ctaType: 'CONTACT_US',
        suggestedImage: 'Berater z tabletem bei Kunde',
        colors: { bg: '#0d9488', text: '#ffffff', accent: '#99f6e4' },
    },
    // Seasonal
    {
        id: 'summer-vibes',
        category: 'seasonal',
        name: 'Sommer-Feeling',
        headline: '☀️ Sommer auf der Terrasse!',
        primaryText: '🍹 Genießen Sie den Sommer — unter Ihrem eigenen Dach!\n\nMit unserer Überdachung:\n☀️ Entspannte Nachmittage im Schatten\n🌧️ Grillpartys auch bei Regen\n🌙 Romantische Abende mit LED-Beleuchtung\n\n🔥 Sommerangebot: Jetzt bestellen — noch diesen Sommer genießen!\n\n📞 Beratung: kostenlos & unverbindlich',
        description: 'Sommer-Feeling auf der eigenen Terrasse',
        ctaType: 'LEARN_MORE',
        suggestedImage: 'Letnia terrasse z grillem i rodziną',
        colors: { bg: '#ea580c', text: '#ffffff', accent: '#fdba74' },
    },
    {
        id: 'winter-plan',
        category: 'seasonal',
        name: 'Winter-Planung',
        headline: '❄️ Jetzt planen — im Frühling genießen!',
        primaryText: '📐 Der Winter ist die beste Zeit zum PLANEN!\n\n🔹 Kostenlose 3D-Visualisierung\n🔹 20% Frühbucher-Rabatt\n🔹 Festpreis-Garantie bis zur Montage\n🔹 Wunschtermin ab März reservieren\n\n❄️ Im Winter sparen — im Frühling genießen!\n\n📞 Jetzt beraten lassen →',
        description: 'Winteraktion — planen und sparen',
        ctaType: 'SIGN_UP',
        suggestedImage: 'Zimowy dom z wizualizacją terrassy',
        colors: { bg: '#1e3a5f', text: '#ffffff', accent: '#93c5fd' },
    },
    // Tips
    {
        id: 'alu-vs-holz',
        category: 'tip',
        name: 'Aluminium vs Holz',
        headline: '💡 Experten-Tipp: Alu vs. Holz',
        primaryText: '🤔 Aluminium oder Holz — was ist besser?\n\n🔹 Aluminium:\n✅ 30+ Jahre Lebensdauer\n✅ Wartungsfrei — nie wieder streichen\n✅ Korrosionsfrei & UV-beständig\n✅ 100% recyclebar\n\n🔸 Holz:\n❌ 10-15 Jahre, dann erneuern\n❌ Alle 2 Jahre streichen\n❌ Anfällig für Feuchtigkeit\n\n➡️ Die kluge Investition: ALUMINIUM',
        description: 'Aluminium vs. Holz — der ehrliche Vergleich',
        ctaType: 'LEARN_MORE',
        suggestedImage: 'Porównanie aluminium i drewna - infografika',
        colors: { bg: '#6d28d9', text: '#ffffff', accent: '#a78bfa' },
    },
    // Behind the scenes
    {
        id: 'montage-day',
        category: 'behind_scenes',
        name: 'Montage-Tag',
        headline: '🔧 Ein Tag — ein Traum!',
        primaryText: '🏗️ Montage im Zeitraffer!\n\n⏰ 6:00 — Ankunft auf der Baustelle\n⏰ 8:00 — Fundamente gesetzt\n⏰ 12:00 — Tragwerk montiert\n⏰ 16:00 — Dach & Rinne fertig\n⏰ 17:00 — Aufräumen & Übergabe ✅\n\n💪 Ein Tag. Ein Team. Ein neues Terrassendach.\n\n📞 Buchen Sie Ihren Montagetermin!',
        description: 'Professionelle Montage — ein Tag, ein Dach',
        ctaType: 'LEARN_MORE',
        suggestedImage: 'Team montażowy w akcji',
        colors: { bg: '#475569', text: '#ffffff', accent: '#94a3b8' },
    },
];

export default function CreativeLibraryTab() {
    const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate | null>(null);
    const [editedText, setEditedText] = useState('');
    const [editedHeadline, setEditedHeadline] = useState('');
    const [selectedFormat, setSelectedFormat] = useState<Format>('feed');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [publishTarget, setPublishTarget] = useState<'fb' | 'ig' | 'both'>('fb');

    const filteredTemplates = selectedCategory === 'all'
        ? AD_TEMPLATES
        : AD_TEMPLATES.filter(t => t.category === selectedCategory);

    const handleSelectTemplate = (t: AdTemplate) => {
        setSelectedTemplate(t);
        setEditedText(t.primaryText);
        setEditedHeadline(t.headline);
        setImageUrl('');
        setImagePreview('');
    };

    const resizeImage = (file: File, targetW: number, targetH: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d')!;
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
            const size = FORMAT_SIZES[selectedFormat];
            const resized = await resizeImage(file, size.w, size.h);
            const fileName = `fb-creatives/${Date.now()}-${size.w}x${size.h}.jpg`;
            const { error } = await supabase.storage.from('media').upload(fileName, resized, { contentType: 'image/jpeg', upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
            setImageUrl(urlData.publicUrl);
            setImagePreview(urlData.publicUrl);
            toast.success(`✅ Zdjęcie przeskalowane do ${size.w}×${size.h} i przesłane!`);
        } catch (err: any) { toast.error('Upload error: ' + err.message); }
        finally { setUploadingImage(false); }
    };

    const handlePublish = async () => {
        if (!editedText.trim()) return;
        setPublishing(true);
        try {
            if (publishTarget === 'both') {
                await FacebookService.publishBoth({
                    message: editedText,
                    caption: editedText,
                    media_url: imageUrl || undefined,
                    image_url: imageUrl || undefined,
                });
                toast.success('✅ Opublikowano na FB + IG!');
            } else if (publishTarget === 'fb') {
                await FacebookService.publishPost({ message: editedText, media_url: imageUrl || undefined });
                toast.success('✅ Opublikowano na Facebook!');
            } else {
                if (!imageUrl) { toast.error('Instagram wymaga zdjęcia!'); setPublishing(false); return; }
                await FacebookService.publishInstagram({ image_url: imageUrl, caption: editedText });
                toast.success('✅ Opublikowano na Instagram!');
            }
            setSelectedTemplate(null);
        } catch (err: any) { toast.error('Błąd: ' + err.message); }
        finally { setPublishing(false); }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-red-700 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-50" />
                <div className="relative">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">🎨</span>
                        Creative Library
                    </h2>
                    <p className="text-pink-200 text-sm mt-1">Gotowe szablony reklam • Auto-resize • Publikuj jednym klikiem</p>
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-pink-200">
                        <span>📐 3 formaty: Feed / Square / Story</span>
                        <span>📝 {AD_TEMPLATES.length} szablonów</span>
                        <span>🚀 Publikuj na FB + IG</span>
                    </div>
                </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'}`}>
                    📋 Wszystkie ({AD_TEMPLATES.length})
                </button>
                {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => (
                    <button key={key} onClick={() => setSelectedCategory(key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === key ? `bg-gradient-to-r ${meta.color} text-white shadow-md` : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'}`}>
                        {meta.icon} {meta.label} ({AD_TEMPLATES.filter(t => t.category === key).length})
                    </button>
                ))}
            </div>

            {/* Template grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(t => {
                    const catMeta = CATEGORY_META[t.category];
                    return (
                        <div
                            key={t.id}
                            onClick={() => handleSelectTemplate(t)}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                        >
                            {/* Color header */}
                            <div className={`h-24 bg-gradient-to-br ${catMeta.color} p-4 relative overflow-hidden`}>
                                <div className="absolute top-2 right-2">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-white font-bold`}>
                                        {catMeta.icon} {catMeta.label}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 left-4 right-4">
                                    <h3 className="text-white font-bold text-sm truncate">{t.headline}</h3>
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                    <span className="text-white text-lg opacity-0 group-hover:opacity-100 transition-all">✏️ Edytuj</span>
                                </div>
                            </div>
                            {/* Content */}
                            <div className="p-3">
                                <h4 className="font-bold text-xs text-slate-700 mb-1">{t.name}</h4>
                                <p className="text-[10px] text-slate-500 line-clamp-3">{t.primaryText.substring(0, 100)}...</p>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                    <span className="text-[9px] text-slate-400">📸 {t.suggestedImage}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">{t.ctaType.replace(/_/g, ' ')}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Template Editor Modal */}
            {selectedTemplate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTemplate(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div className={`bg-gradient-to-r ${CATEGORY_META[selectedTemplate.category].color} p-5 rounded-t-2xl`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">{CATEGORY_META[selectedTemplate.category].icon}</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{selectedTemplate.name}</h3>
                                        <p className="text-white/70 text-xs">{selectedTemplate.description}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTemplate(null)} className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center">✕</button>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Format selector with auto-resize */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">📐 Format obrazka (auto-resize):</p>
                                <div className="flex gap-2">
                                    {(Object.entries(FORMAT_SIZES) as [Format, typeof FORMAT_SIZES[Format]][]).map(([key, size]) => (
                                        <button key={key} onClick={() => setSelectedFormat(key)} className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border-2 ${selectedFormat === key ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-500 hover:border-pink-300'}`}>
                                            <span className="text-lg block">{size.icon}</span>
                                            <span className="block font-bold mt-1">{size.label}</span>
                                            <span className="block text-[9px] text-slate-400">{size.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Image upload */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">🖼️ Zdjęcie reklamy:</p>
                                <p className="text-[10px] text-slate-400 mb-2">💡 {selectedTemplate.suggestedImage}</p>
                                <label className="cursor-pointer block">
                                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${uploadingImage ? 'border-pink-400 bg-pink-50' : imagePreview ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-pink-400'}`}>
                                        {uploadingImage ? (
                                            <p className="text-sm text-pink-600 font-medium">⏳ Skaluję do {FORMAT_SIZES[selectedFormat].w}×{FORMAT_SIZES[selectedFormat].h}...</p>
                                        ) : imagePreview ? (
                                            <div className="space-y-2">
                                                <img src={imagePreview} alt="" className="max-h-32 mx-auto rounded-lg shadow" />
                                                <p className="text-[10px] text-green-600">✅ {FORMAT_SIZES[selectedFormat].w}×{FORMAT_SIZES[selectedFormat].h}px — kliknij aby zmienić</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="text-3xl">📷</span>
                                                <p className="text-sm text-slate-500 mt-2">Kliknij aby dodać zdjęcie</p>
                                                <p className="text-[10px] text-slate-400">Auto-resize do {FORMAT_SIZES[selectedFormat].w}×{FORMAT_SIZES[selectedFormat].h}px</p>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            </div>

                            {/* Headline editor */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">📌 Nagłówek:</p>
                                <input
                                    value={editedHeadline}
                                    onChange={e => setEditedHeadline(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                />
                            </div>

                            {/* Primary text editor */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">✏️ Treść reklamy:</p>
                                <textarea
                                    value={editedText}
                                    onChange={e => setEditedText(e.target.value)}
                                    rows={8}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none resize-y"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">{editedText.length} znaków • CTA: {selectedTemplate.ctaType.replace(/_/g, ' ')}</p>
                            </div>

                            {/* Preview card */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase">👁️ Podgląd reklamy</p>
                                <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden max-w-[320px]">
                                    {imagePreview && <img src={imagePreview} alt="" className="w-full h-40 object-cover" />}
                                    <div className="p-3">
                                        <p className="text-xs font-bold text-slate-800">{editedHeadline}</p>
                                        <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-line line-clamp-4">{editedText.substring(0, 150)}...</p>
                                        <button className="mt-2 w-full py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded">{selectedTemplate.ctaType.replace(/_/g, ' ')}</button>
                                    </div>
                                </div>
                            </div>

                            {/* Publish targets */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">📱 Publikuj jako post na:</p>
                                <div className="flex gap-2">
                                    {[
                                        { val: 'fb' as const, label: '📘 Facebook', color: 'from-blue-500 to-blue-600' },
                                        { val: 'ig' as const, label: '📸 Instagram', color: 'from-pink-500 to-purple-600' },
                                        { val: 'both' as const, label: '📘+📸 Obie', color: 'from-blue-500 to-pink-500' },
                                    ].map(opt => (
                                        <button key={opt.val} onClick={() => setPublishTarget(opt.val)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${publishTarget === opt.val ? `bg-gradient-to-r ${opt.color} text-white shadow-lg` : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setSelectedTemplate(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200">
                                    Anuluj
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing || !editedText.trim()}
                                    className="flex-[2] px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-bold hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {publishing ? (
                                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publikuję...</>
                                    ) : (
                                        <>🚀 Opublikuj jako post</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
