import React, { useState, useMemo, useEffect } from 'react';
import { FacebookService } from '../../services/database/facebook.service';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// SEASONAL CONTENT ENGINE — Aluminium-Überdachungen DE
// ═══════════════════════════════════════════

type PostType = 'product' | 'testimonial' | 'tip' | 'behind_scenes' | 'promo' | 'seasonal' | 'engagement';
type Platform = 'fb' | 'ig' | 'both';

interface CalendarPost {
    id: string;
    date: string; // YYYY-MM-DD
    caption_de: string;
    caption_hashtags: string;
    post_type: PostType;
    platform: Platform;
    status: 'planned' | 'published' | 'failed' | 'skipped';
    image_suggestion: string;
    time_slot: string; // HH:MM
    season: string;
    fb_post_id?: string;
    ig_post_id?: string;
}

const POST_TYPE_META: Record<PostType, { icon: string; label: string; color: string }> = {
    product: { icon: '🏠', label: 'Produkt', color: 'bg-blue-100 text-blue-700' },
    testimonial: { icon: '⭐', label: 'Opinia klienta', color: 'bg-amber-100 text-amber-700' },
    tip: { icon: '💡', label: 'Porada eksperta', color: 'bg-emerald-100 text-emerald-700' },
    behind_scenes: { icon: '🔧', label: 'Za kulisami', color: 'bg-purple-100 text-purple-700' },
    promo: { icon: '🔥', label: 'Promocja', color: 'bg-red-100 text-red-700' },
    seasonal: { icon: '🌿', label: 'Sezonowy', color: 'bg-teal-100 text-teal-700' },
    engagement: { icon: '💬', label: 'Engagement', color: 'bg-pink-100 text-pink-700' },
};

const IG_HASHTAG_SETS: Record<string, string> = {
    product: '#Terrassenüberdachung #Aluminium #ModernesWohnen #Outdoor #Gartenmöbel #Überdachung #Terrassendach #Sonnenschutz #Gartenideen #WohnenImGrünen',
    testimonial: '#Kundenbewertung #ZufriedeneKunden #Referenz #Qualität #MadeInGermany #Handwerk #Montage #Terrassentraum',
    tip: '#ExpertenTipp #Wissen #Bauratgeber #Terrassentipp #Aluminium #Qualität #Langlebig #Pflegeleicht #Investition',
    behind_scenes: '#BehindTheScenes #Werkstatt #Handwerk #TeamWork #Montage #Aufbau #Profi #Qualitätsarbeit',
    promo: '#Angebot #Aktion #Sonderaktion #JetztSparen #Terrassenüberdachung #FrühbucherRabatt #KostenlosBeratung',
    seasonal: '#Frühling #Sommer #Garten #Terrasse #Outdoor #Sonnenschutz #RegenschutzTerrasse #GanzjahresGenuss',
    engagement: '#Frage #Community #Meinung #GartenLiebe #OutdoorLiving #Inspiration #Traumterrasse',
};

// Generate 90 days of content from today
function generateSeasonalContent(startDate: Date): CalendarPost[] {
    const posts: CalendarPost[] = [];
    const today = new Date(startDate);

    // Content templates organized by type and season
    const contentPool = {
        // SPRING (Mar-May)
        spring: [
            { type: 'seasonal' as PostType, caption: '🌸 Der Frühling ist da — und mit ihm die perfekte Zeit, Ihre Terrasse aufzuwerten! Unsere Aluminium-Überdachungen schützen Sie 365 Tage im Jahr — bei Sonne UND Regen. ☀️🌧️\n\n👉 Jetzt kostenlose Beratung anfordern!\n📞 Rufen Sie uns an oder schreiben Sie eine Nachricht.', image: 'Terrasse mit Blumen im Frühling' },
            { type: 'product' as PostType, caption: '🏠 Terrassenüberdachung „Classic Line"\n\n✅ Pulverbeschichtetes Aluminium — korrosionsfrei\n✅ 16mm Stegplatten — optimaler Lichteinfall\n✅ Integrierte LED-Beleuchtung optional\n✅ Bis zu 7m Spannweite ohne Stütze\n\n💰 Ab 3.490 € inkl. Montage\n\nIhr Traumdach — nur einen Anruf entfernt! 📞', image: 'Aluminium Terrassenüberdachung Classic' },
            { type: 'tip' as PostType, caption: '💡 EXPERTEN-TIPP: Warum Aluminium?\n\nIm Vergleich zu Holz:\n🔹 Wartungsfrei — kein Streichen nötig\n🔹 Rostfrei — auch nach 20 Jahren\n🔹 Leichter — weniger Fundamentlast\n🔹 Recyclebar — 100% umweltfreundlich\n\n📊 Lebensdauer: Alu 30+ Jahre vs. Holz 10-15 Jahre\n\n➡️ Die kluge Investition fürs Leben!', image: 'Aluminium vs Holz Vergleich' },
            { type: 'engagement' as PostType, caption: '❓ Was ist Ihnen bei einer Terrassenüberdachung am WICHTIGSTEN?\n\nA) ☀️ Sonnenschutz\nB) 🌧️ Regenschutz\nC) 🎨 Design / Optik\nD) 💰 Preis-Leistung\n\nSchreiben Sie A, B, C oder D in die Kommentare! ⬇️\n\n#Umfrage #Terrasse', image: 'Schöne Terrasse mit Frage-Overlay' },
            { type: 'behind_scenes' as PostType, caption: '🔧 Ein Blick hinter die Kulissen!\n\nHeute montiert unser Team eine 6x4m Überdachung in nur einem Tag. ⏱️\n\nVon der Planung bis zur Fertigstellung — alles aus einer Hand.\n\n💪 Präzision • Erfahrung • Leidenschaft\n\n📸 Swipe für Vorher/Nachher! →', image: 'Montageteam bei der Arbeit' },
            { type: 'promo' as PostType, caption: '🔥 FRÜHBUCHER-AKTION — Nur bis Ende des Monats!\n\n🎁 10% Rabatt auf alle Terrassenüberdachungen\n🎁 GRATIS LED-Beleuchtung (Wert: 490€)\n🎁 Kostenlose Vor-Ort-Beratung\n\n📞 Jetzt Termin sichern — die Plätze sind begrenzt!\n\n⏰ Nur noch wenige Termine verfügbar!', image: 'Promo Banner Frühbucher' },
            { type: 'testimonial' as PostType, caption: '⭐⭐⭐⭐⭐ Kundenmeinung\n\n„Wir haben unsere Terrasse komplett neu gestaltet und sind absolut begeistert! Die Montage war professionell und schnell. Jetzt genießen wir unsere Terrasse bei jedem Wetter."\n\n— Familie Weber, München\n\n📷 Vielen Dank für das Vertrauen! 🙏', image: 'Zufriedener Kunde vor Terrasse' },
        ],
        // SUMMER (Jun-Aug)  
        summer: [
            { type: 'seasonal' as PostType, caption: '☀️ Sommer-Feeling auf der eigenen Terrasse!\n\nMit unseren Überdachungen genießen Sie:\n🍹 Schattige Cocktail-Abende\n🌧️ Grillpartys — auch bei Regen\n📖 Entspannung — 365 Tage im Jahr\n\nLassen Sie sich inspirieren! 👇', image: 'Sommer-Terrasse mit Familie' },
            { type: 'product' as PostType, caption: '🏠 NEU: Lamellendach „Bio-Clima"\n\n🌬️ Verstellbare Lamellen — von 0° bis 150°\n☀️ Sonnenschutz nach Bedarf\n🌧️ 100% wasserdicht bei geschlossenen Lamellen\n📱 Smart-Home-kompatibel\n\n🎯 Die Zukunft der Terrassenüberdachung!\n💰 Angebot anfragen →', image: 'Bioclimatic Pergola' },
            { type: 'tip' as PostType, caption: '💡 SOMMER-TIPP: So pflegen Sie Ihr Alu-Terrassendach richtig!\n\n1️⃣ 2x jährlich mit Wasser abspülen\n2️⃣ Laub aus der Regenrinne entfernen\n3️⃣ Gelegentlich Glasflächen reinigen\n\nDas war\'s! 😄 Kein Streichen, kein Ölen, kein Stress.\n\n✅ Aluminium = wartungsfrei!', image: 'Pflege-Tipps Infografik' },
            { type: 'engagement' as PostType, caption: '🌡️ 35°C im Schatten — was machen SIE gerade?\n\nWir genießen den Sommer unter unserem Terrassendach! 🍹\n\nTeilen Sie Ihre besten Sommer-Momente auf der Terrasse! 📸\n\n#SommerAufDerTerrasse #OutdoorLiving', image: 'Heiße Sommer-Terrasse' },
            { type: 'behind_scenes' as PostType, caption: '🏗️ Montage im Zeitraffer! ⏩\n\n6:00 Uhr — Ankunft auf der Baustelle\n8:00 Uhr — Fundamente gesetzt\n12:00 Uhr — Tragwerk steht\n16:00 Uhr — Dach fertig montiert\n17:00 Uhr — Aufräumen & Übergabe ✅\n\n💪 Ein Tag — ein neues Terrassendach!', image: 'Zeitraffer Montage' },
            { type: 'promo' as PostType, caption: '🔥 SOMMER-AKTION: Ihr Traumdach zum Bestpreis!\n\n☀️ Jetzt bestellen — noch im Sommer genießen!\n🎁 Kostenlose VSG-Glasupgrade\n🎁 GRATIS Sonnensegel-Set (Wert: 390€)\n\n📞 24h Beratungs-Hotline\n⏰ Aktion gültig solange Vorrat reicht!', image: 'Sommer-Aktion Banner' },
            { type: 'testimonial' as PostType, caption: '⭐⭐⭐⭐⭐\n\n„Endlich können wir draußen essen, ohne ständig aufs Wetter zu schauen! Die Qualität ist erstklassig und die Montage war in nur 6 Stunden erledigt. Top Service!"\n\n— Herr Schneider, Hamburg 🏡\n\nDanke für die tolle Bewertung! 💚', image: 'Essen unter Überdachung' },
        ],
        // AUTUMN (Sep-Nov)
        autumn: [
            { type: 'seasonal' as PostType, caption: '🍂 Der Herbst kommt — aber Ihre Terrasse bleibt nutzbar!\n\nMit unserer Überdachung:\n🌧️ Gemütliche Regentage draußen\n🍁 Herbstliche Atmosphäre genießen\n☕ Warmer Kakao unter dem Dach\n\n➡️ Jetzt noch vor dem Winter montieren lassen!', image: 'Herbstliche Terrasse' },
            { type: 'product' as PostType, caption: '🏠 Wintergarten-Feeling — ohne Wintergarten!\n\nUnsere Glasschiebewände machen aus Ihrer Terrasse einen geschützten Raum:\n\n✅ Schutz vor Wind & Kälte\n✅ Flexibel öffenbar\n✅ Keine Baugenehmigung nötig*\n\n*In den meisten Bundesländern\n\n📞 Beratung: kostenlos & unverbindlich', image: 'Terrasse mit Glasschiebewänden' },
            { type: 'tip' as PostType, caption: '💡 HERBST-CHECK für Ihre Terrasse:\n\n✅ Regenrinne reinigen\n✅ Schrauben nachziehen\n✅ Glasflächen prüfen\n✅ Glasschiebewände warten\n✅ Beleuchtung testen\n\n📋 Unsere kostenlose Checkliste? Schreiben Sie "CHECK" in die Kommentare! ⬇️', image: 'Herbst-Wartungscheckliste' },
            { type: 'promo' as PostType, caption: '🍂 HERBST-SPECIAL: Planen Sie jetzt — genießen Sie im Frühling!\n\n✅ Jetzt 15% Frühbucher-Rabatt sichern\n✅ Montage nach Ihrem Wunschtermin\n✅ Preis-Garantie bis zur Montage\n\n📞 Beratungstermin vereinbaren — kostenlos!', image: 'Herbst-Angebot Banner' },
        ],
        // WINTER (Dec-Feb)
        winter: [
            { type: 'seasonal' as PostType, caption: '❄️ Winter-Wunderland auf der Terrasse!\n\nJa, auch im Winter lohnt sich eine Überdachung:\n🎄 Weihnachtsbeleuchtung installieren\n❄️ Schneelast? Bis 150 kg/m² kein Problem\n☕ Glühwein unter dem Dach genießen\n\n🎁 Gutschein-Idee: Verschenken Sie ein Terrassendach!', image: 'Winterliche Terrasse mit Beleuchtung' },
            { type: 'tip' as PostType, caption: '💡 WINTER-TIPP: Schneelast auf dem Terrassendach?\n\n✅ Unsere Alu-Dächer tragen bis 150 kg/m²\n✅ Neigung sorgt für natürlichen Schnee-Abgang\n✅ Bei extremem Schneefall: Vorsichtig abkehren\n\n⚠️ NIEMALS mit Salz oder heißem Wasser!\n\nFragen? Wir beraten kostenlos! 📞', image: 'Schnee auf Terrassendach' },
            { type: 'promo' as PostType, caption: '🎁 WINTER-ANGEBOT: Planen Sie Ihr Frühlings-Projekt!\n\n🔹 Kostenlose 3D-Visualisierung\n🔹 Festpreis-Garantie\n🔹 Montage ab März verfügbar\n🔹 Jetzt 20% Frühbucher-Rabatt!\n\n❄️ Im Winter planen — im Frühling genießen!\n📞 Termin vereinbaren →', image: 'Winter-Sale Banner' },
            { type: 'engagement' as PostType, caption: '🎄 DEZEMBER-FRAGE: Was steht 2026 auf Ihrer Wunschliste?\n\n🏠 Neue Terrassenüberdachung\n🌿 Mehr Zeit im Garten verbringen\n🛠️ Renovierung planen\n💆 Mehr Entspannung im Freien\n\nTeilen Sie Ihren Wunsch! ⬇️', image: 'Weihnachts-Wunschliste' },
        ],
    };

    // Determine current season
    const getSeason = (month: number): string => {
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    };

    // Optimal posting times
    const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

    for (let day = 0; day < 90; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() + day);
        const month = date.getMonth() + 1;
        const season = getSeason(month);
        const pool = contentPool[season as keyof typeof contentPool] || contentPool.spring;
        const postIndex = day % pool.length;
        const post = pool[postIndex];
        const dayOfWeek = date.getDay();

        // Best posting times: weekdays 10:00 or 18:00, weekends 12:00
        const timeSlot = dayOfWeek === 0 || dayOfWeek === 6 ? '12:00' : day % 2 === 0 ? '10:00' : '18:00';

        const hashtags = IG_HASHTAG_SETS[post.type] || IG_HASHTAG_SETS.product;

        posts.push({
            id: `cal-${date.toISOString().split('T')[0]}-${day}`,
            date: date.toISOString().split('T')[0],
            caption_de: post.caption,
            caption_hashtags: hashtags,
            post_type: post.type,
            platform: 'both',
            status: 'planned',
            image_suggestion: post.image,
            time_slot: timeSlot,
            season,
        });
    }

    return posts;
}

// ═══════════════════════════════════════════
// CONTENT CALENDAR TAB
// ═══════════════════════════════════════════

export default function ContentCalendarTab() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [posts, setPosts] = useState<CalendarPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
    const [editCaption, setEditCaption] = useState('');
    const [editPlatform, setEditPlatform] = useState<Platform>('both');
    const [publishing, setPublishing] = useState(false);
    const [igAccount, setIgAccount] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [filterType, setFilterType] = useState<PostType | 'all'>('all');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [postImageUrl, setPostImageUrl] = useState('');

    useEffect(() => {
        const generated = generateSeasonalContent(new Date());
        setPosts(generated);
        // Check IG connection
        FacebookService.getInstagramAccount()
            .then(data => {
                if (!data.error) setIgAccount(data);
            })
            .catch(() => {});
    }, []);

    // Calendar helpers
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
    const dayNames = ['Nd','Pn','Wt','Śr','Cz','Pt','So'];

    const postsForMonth = useMemo(() => {
        return posts.filter(p => {
            const pDate = new Date(p.date);
            return pDate.getFullYear() === year && pDate.getMonth() === month;
        });
    }, [posts, year, month]);

    const filteredPosts = useMemo(() => {
        let fp = postsForMonth;
        if (filterType !== 'all') fp = fp.filter(p => p.post_type === filterType);
        return fp;
    }, [postsForMonth, filterType]);

    const getPostForDay = (day: number): CalendarPost | undefined => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return postsForMonth.find(p => p.date === dateStr);
    };

    const handleSelectPost = (post: CalendarPost) => {
        setSelectedPost(post);
        setEditCaption(post.caption_de);
        setEditPlatform(post.platform);
        setPostImageUrl('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const fileName = `fb-calendar/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, file, { contentType: file.type, upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
            setPostImageUrl(urlData.publicUrl);
            toast.success('📸 Zdjęcie przesłane!');
        } catch (err: any) { toast.error('Błąd uploadu: ' + err.message); }
        finally { setUploadingImage(false); }
    };

    const handlePublishPost = async () => {
        if (!selectedPost || !editCaption.trim()) return;
        setPublishing(true);
        try {
            const fullCaption = editPlatform === 'ig' || editPlatform === 'both'
                ? `${editCaption}\n\n${selectedPost.caption_hashtags}`
                : editCaption;

            if (editPlatform === 'both') {
                const result = await FacebookService.publishBoth({
                    message: editCaption,
                    caption: fullCaption,
                    media_url: postImageUrl || undefined,
                    image_url: postImageUrl || undefined,
                });
                const fbOk = result.fb && !result.fb.error;
                const igOk = result.ig && !result.ig.error;
                
                setPosts(prev => prev.map(p => p.id === selectedPost.id ? {
                    ...p,
                    status: 'published' as const,
                    caption_de: editCaption,
                    platform: editPlatform,
                    fb_post_id: result.fb?.id,
                    ig_post_id: result.ig?.ig_media_id,
                } : p));
                
                if (fbOk && igOk) toast.success('✅ Opublikowano na FB + IG!');
                else if (fbOk) toast.success('✅ Opublikowano na FB! ⚠️ IG: ' + (result.ig?.error || result.ig?.reason));
                else if (igOk) toast.success('✅ Opublikowano na IG! ⚠️ FB: ' + result.fb?.error);
                else toast.error('❌ Nie udało się opublikować');
            } else if (editPlatform === 'fb') {
                await FacebookService.publishPost({
                    message: editCaption,
                    media_url: postImageUrl || undefined,
                });
                setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, status: 'published' as const, caption_de: editCaption } : p));
                toast.success('✅ Opublikowano na Facebook!');
            } else {
                if (!postImageUrl) { toast.error('Instagram wymaga zdjęcia!'); setPublishing(false); return; }
                await FacebookService.publishInstagram({
                    image_url: postImageUrl,
                    caption: fullCaption,
                });
                setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, status: 'published' as const, caption_de: editCaption } : p));
                toast.success('✅ Opublikowano na Instagram!');
            }
            setSelectedPost(null);
        } catch (err: any) {
            toast.error('Błąd publikacji: ' + err.message);
            setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, status: 'failed' as const } : p));
        } finally { setPublishing(false); }
    };

    const stats = useMemo(() => ({
        total: postsForMonth.length,
        published: postsForMonth.filter(p => p.status === 'published').length,
        planned: postsForMonth.filter(p => p.status === 'planned').length,
        failed: postsForMonth.filter(p => p.status === 'failed').length,
    }), [postsForMonth]);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayPost = posts.find(p => p.date === todayStr && p.status === 'planned');

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-50" />
                <div className="relative">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <span className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">📅</span>
                                Content Calendar
                            </h2>
                            <p className="text-purple-200 text-sm mt-1">Zaplanuj posty FB + IG na 90 dni • Sezonowa strategia</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {igAccount && (
                                <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2 border border-white/20">
                                    <div className="flex items-center gap-2">
                                        {igAccount.profile_picture_url && <img src={igAccount.profile_picture_url} alt="" className="w-8 h-8 rounded-full" />}
                                        <div>
                                            <p className="text-xs font-bold">@{igAccount.username}</p>
                                            <p className="text-[10px] text-purple-200">{igAccount.followers_count?.toLocaleString()} obserwujących</p>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
                                <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}>📅 Kalendarz</button>
                                <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}>📋 Lista</button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mt-4">
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-[10px] text-purple-200 uppercase">Zaplanowanych</p>
                        </div>
                        <div className="bg-green-500/20 backdrop-blur rounded-lg px-3 py-2">
                            <p className="text-2xl font-bold text-green-300">{stats.published}</p>
                            <p className="text-[10px] text-green-200 uppercase">Opublikowanych</p>
                        </div>
                        <div className="bg-blue-500/20 backdrop-blur rounded-lg px-3 py-2">
                            <p className="text-2xl font-bold text-blue-300">{stats.planned}</p>
                            <p className="text-[10px] text-blue-200 uppercase">Do publikacji</p>
                        </div>
                        <div className="bg-red-500/20 backdrop-blur rounded-lg px-3 py-2">
                            <p className="text-2xl font-bold text-red-300">{stats.failed}</p>
                            <p className="text-[10px] text-red-200 uppercase">Błędy</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's post — Quick publish */}
            {todayPost && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📢</span>
                                <h3 className="font-bold text-green-800">Dzisiejszy post — gotowy do publikacji!</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${POST_TYPE_META[todayPost.post_type].color}`}>
                                    {POST_TYPE_META[todayPost.post_type].icon} {POST_TYPE_META[todayPost.post_type].label}
                                </span>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed max-h-24 overflow-auto">{todayPost.caption_de.substring(0, 200)}...</p>
                            <p className="text-[10px] text-green-600 mt-1">⏰ Sugerowana godzina: {todayPost.time_slot} • 📸 {todayPost.image_suggestion}</p>
                        </div>
                        <button
                            onClick={() => handleSelectPost(todayPost)}
                            className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-md shadow-green-200 whitespace-nowrap ml-4"
                        >
                            🚀 Publikuj teraz
                        </button>
                    </div>
                </div>
            )}

            {/* Month Navigation + Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-sm">←</button>
                    <h3 className="text-lg font-bold text-slate-800">{monthNames[month]} {year}</h3>
                    <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-sm">→</button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setFilterType('all')} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Wszystkie</button>
                    {(Object.entries(POST_TYPE_META) as [PostType, typeof POST_TYPE_META[PostType]][]).map(([key, meta]) => (
                        <button key={key} onClick={() => setFilterType(key)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${filterType === key ? meta.color + ' shadow-sm' : 'bg-white text-slate-500 border border-slate-200'}`}>
                            {meta.icon} {meta.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Grid */}
            {viewMode === 'calendar' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                        {dayNames.map(d => (
                            <div key={d} className="text-center py-2 text-xs font-bold text-slate-500 uppercase">{d}</div>
                        ))}
                    </div>
                    {/* Calendar cells */}
                    <div className="grid grid-cols-7">
                        {/* Empty cells for days before month start */}
                        {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => (
                            <div key={`empty-${i}`} className="border-b border-r border-slate-100 min-h-[90px] bg-slate-50/50" />
                        ))}
                        {/* Days of month */}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const post = getPostForDay(day);
                            const isToday = dateStr === todayStr;
                            const isPast = dateStr < todayStr;

                            return (
                                <div
                                    key={day}
                                    className={`border-b border-r border-slate-100 min-h-[90px] p-1.5 transition-all cursor-pointer hover:bg-blue-50/50 ${
                                        isToday ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : isPast ? 'bg-slate-50/30' : ''
                                    }`}
                                    onClick={() => post && handleSelectPost(post)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-bold ${isToday ? 'text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>{day}</span>
                                        {post && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                post.status === 'published' ? 'bg-green-400' : post.status === 'failed' ? 'bg-red-400' : 'bg-slate-300'
                                            }`} />
                                        )}
                                    </div>
                                    {post && (filterType === 'all' || post.post_type === filterType) && (
                                        <div className={`rounded-md px-1.5 py-1 ${POST_TYPE_META[post.post_type].color} transition-all hover:shadow-sm`}>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px]">{POST_TYPE_META[post.post_type].icon}</span>
                                                <span className="text-[9px] font-bold truncate">{POST_TYPE_META[post.post_type].label}</span>
                                            </div>
                                            <p className="text-[8px] mt-0.5 truncate opacity-70">{post.caption_de.substring(0, 40)}...</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="text-[8px]">⏰ {post.time_slot}</span>
                                                <span className="text-[8px]">{post.platform === 'both' ? '📘📸' : post.platform === 'fb' ? '📘' : '📸'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="space-y-2">
                    {filteredPosts.map(post => {
                        const isPast = post.date < todayStr;
                        return (
                            <div
                                key={post.id}
                                onClick={() => handleSelectPost(post)}
                                className={`bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer ${
                                    post.status === 'published' ? 'border-l-4 border-l-green-400' :
                                    post.status === 'failed' ? 'border-l-4 border-l-red-400' :
                                    post.date === todayStr ? 'border-l-4 border-l-blue-400 bg-blue-50/30' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${POST_TYPE_META[post.post_type].color}`}>
                                            <span className="text-lg">{POST_TYPE_META[post.post_type].icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-700">{new Date(post.date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                <span className="text-[10px] text-slate-400">⏰ {post.time_slot}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${POST_TYPE_META[post.post_type].color}`}>{POST_TYPE_META[post.post_type].label}</span>
                                                <span className="text-[9px]">{post.platform === 'both' ? '📘+📸' : post.platform === 'fb' ? '📘 FB' : '📸 IG'}</span>
                                                {post.status === 'published' && <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold">✅ Opublikowany</span>}
                                                {post.status === 'failed' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">❌ Błąd</span>}
                                            </div>
                                            <p className="text-xs text-slate-600 line-clamp-2">{post.caption_de.substring(0, 120)}...</p>
                                            <p className="text-[9px] text-slate-400 mt-1">📸 {post.image_suggestion}</p>
                                        </div>
                                    </div>
                                    {post.status === 'planned' && !isPast && (
                                        <button className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors whitespace-nowrap ml-3">
                                            🚀 Publikuj
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Post Detail / Publisher Modal */}
            {selectedPost && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">{POST_TYPE_META[selectedPost.post_type].icon}</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{POST_TYPE_META[selectedPost.post_type].label}</h3>
                                        <p className="text-purple-200 text-xs">
                                            {new Date(selectedPost.date).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            {' • '}{selectedPost.time_slot}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPost(null)} className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center">✕</button>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Platform selector */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">📱 Platforma publikacji:</p>
                                <div className="flex gap-2">
                                    {[
                                        { val: 'both' as Platform, label: '📘 Facebook + 📸 Instagram', color: 'from-blue-500 to-pink-500' },
                                        { val: 'fb' as Platform, label: '📘 Tylko Facebook', color: 'from-blue-500 to-blue-600' },
                                        { val: 'ig' as Platform, label: '📸 Tylko Instagram', color: 'from-pink-500 to-purple-600' },
                                    ].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => setEditPlatform(opt.val)}
                                            className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                editPlatform === opt.val
                                                    ? `bg-gradient-to-r ${opt.color} text-white shadow-lg`
                                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {!igAccount && editPlatform !== 'fb' && (
                                    <p className="text-[10px] text-amber-600 mt-1">⚠️ Instagram Business nie jest połączony — połącz w Meta Business Suite</p>
                                )}
                            </div>

                            {/* Caption editor */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">✏️ Treść posta:</p>
                                <textarea
                                    value={editCaption}
                                    onChange={e => setEditCaption(e.target.value)}
                                    rows={8}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-400 focus:outline-none text-sm resize-y"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">{editCaption.length} znaków</p>
                            </div>

                            {/* IG Hashtags preview */}
                            {(editPlatform === 'ig' || editPlatform === 'both') && (
                                <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
                                    <p className="text-[10px] font-bold text-pink-700 mb-1">📸 Hashtagi IG (dodawane automatycznie):</p>
                                    <p className="text-[9px] text-pink-600 break-all">{selectedPost.caption_hashtags}</p>
                                </div>
                            )}

                            {/* Image upload */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">🖼️ Zdjęcie do postu:</p>
                                <p className="text-[10px] text-slate-400 mb-2">💡 Sugestia: {selectedPost.image_suggestion}</p>
                                <div className="flex items-center gap-3">
                                    <label className="flex-1 cursor-pointer">
                                        <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                                            uploadingImage ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-purple-400'
                                        }`}>
                                            {uploadingImage ? (
                                                <p className="text-sm text-purple-600">⏳ Przesyłam...</p>
                                            ) : postImageUrl ? (
                                                <div className="space-y-2">
                                                    <img src={postImageUrl} alt="" className="max-h-20 mx-auto rounded-lg" />
                                                    <p className="text-[10px] text-green-600">✅ Gotowe — kliknij aby zmienić</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500">📷 Kliknij aby dodać zdjęcie</p>
                                            )}
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                </div>
                                {(editPlatform === 'ig' || editPlatform === 'both') && !postImageUrl && (
                                    <p className="text-[10px] text-red-500 mt-1">⚠️ Instagram wymaga zdjęcia do publikacji!</p>
                                )}
                            </div>

                            {/* Publish button */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setSelectedPost(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors">
                                    Anuluj
                                </button>
                                <button
                                    onClick={handlePublishPost}
                                    disabled={publishing || !editCaption.trim()}
                                    className="flex-[2] px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {publishing ? (
                                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publikuję...</>
                                    ) : (
                                        <>🚀 Opublikuj {editPlatform === 'both' ? 'na FB + IG' : editPlatform === 'fb' ? 'na Facebook' : 'na Instagram'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Strategy Guide */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs">📖</span>
                    Strategia treści — Aluminium-Überdachungen 2026
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                    <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                        <p className="font-bold text-green-300">🌸 Wiosna (Marzec–Maj)</p>
                        <p className="text-slate-300 mt-1">Peak planowania. Klienci szukają rozwiązań na lato. Dużo produktów i promocji.</p>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                        <p className="font-bold text-yellow-300">☀️ Lato (Czerwiec–Sierpień)</p>
                        <p className="text-slate-300 mt-1">Montaże w toku. Case studies, zdjęcia realizacji, wartość użytkowa.</p>
                    </div>
                    <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                        <p className="font-bold text-orange-300">🍂 Jesień (Wrzesień–Listopad)</p>
                        <p className="text-slate-300 mt-1">Ostatnia szansa przed zimą. Frühbucher na następny rok.</p>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                        <p className="font-bold text-blue-300">❄️ Zima (Grudzień–Luty)</p>
                        <p className="text-slate-300 mt-1">Planowanie na wiosnę. Gutscheiny, 3D wizualizacje, early bird.</p>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] text-slate-400">
                    <p>📊 <strong className="text-white">Najlepszy czas:</strong> Wt–Cz 10:00 i 18:00</p>
                    <p>📱 <strong className="text-white">Format:</strong> Karuzela &gt; Zdjęcie &gt; Video</p>
                    <p>🎯 <strong className="text-white">Mix:</strong> 40% wartość, 30% produkt, 20% social proof, 10% promo</p>
                </div>
            </div>
        </div>
    );
}
