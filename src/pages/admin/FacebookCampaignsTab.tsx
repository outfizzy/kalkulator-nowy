import React, { useEffect, useState } from 'react';
import { FacebookService } from '../../services/database/facebook.service';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════
// AI CAMPAIGN TEMPLATES — German Aluminum Roofing Market
// ═══════════════════════════════════════════════════════════

const STOCK_IMAGES = [
    { key: 'terrasse', src: '/fb-terrasse.png', label: '🏠 Terrassenüberdachung', category: 'Terrasse' },
    { key: 'terrasse-night', src: '/fb-terrasse-night.png', label: '🌙 Terrasse Abend/LED', category: 'Terrasse' },
    { key: 'carport', src: '/fb-carport.png', label: '🚗 Aluminium Carport', category: 'Carport' },
    { key: 'pergola', src: '/fb-pergola.png', label: '🌿 Bioklimatische Pergola', category: 'Pergola' },
    { key: 'wintergarten', src: '/fb-wintergarten.png', label: '🏡 Wintergarten', category: 'Wintergarten' },
    { key: 'montage', src: '/fb-montage.png', label: '🛠️ Montage / Team', category: 'Montage' },
];

const AD_FORMATS = [
    { value: 'single', label: '🖼️ Pojedyncze zdjęcie', desc: 'Jeden obraz z tekstem i CTA' },
    { value: 'carousel', label: '🎠 Karuzela (2-10 zdjęć)', desc: 'Przewijane karty z osobnymi nagłówkami' },
    { value: 'collection', label: '📱 Kolaż / Collection', desc: 'Główne zdjęcie + 3 miniaturki' },
];

const AD_IMAGES: Record<string, string> = Object.fromEntries(STOCK_IMAGES.map(i => [i.key, i.src]));

const CTA_OPTIONS = [
    { value: 'LEARN_MORE', label: 'Mehr erfahren' },
    { value: 'GET_QUOTE', label: 'Angebot anfordern' },
    { value: 'CONTACT_US', label: 'Kontaktieren' },
    { value: 'SHOP_NOW', label: 'Jetzt kaufen' },
    { value: 'SIGN_UP', label: 'Registrieren' },
    { value: 'BOOK_NOW', label: 'Jetzt buchen' },
];

const AI_CAMPAIGN_TEMPLATES = [
    {
        id: 'terrasse-traffic',
        name: 'Terrassenüberdachung — Mehr Anfragen',
        objective: 'OUTCOME_TRAFFIC',
        daily_budget: '15',
        description: 'Ruch na stronę www. Targetowanie właścicieli domów w Niemczech, 30-65 lat, zainteresowania: Haus & Garten, Terrasse, Renovierung.',
        audience_hint: 'Hauseigentümer, 30-65, DE, Interessen: Terrasse, Garten, Renovierung',
        ad_copy_hint: '🏠 Ihre Traumterrasse wartet! Aluminium-Terrassenüberdachung ab €X — kostenlose Beratung & Aufmaß',
        tags: ['Ruch', 'Sezon'],
        color: 'from-green-500 to-emerald-600',
        icon: '🏠',
        season: 'Frühling/Sommer',
        // Ad Creative
        primary_text: '🏠 Ihre Traumterrasse wartet!\n\nAluminium-Terrassenüberdachung nach Maß — robust, langlebig und wetterfest. Inklusive kostenloser Beratung und professioneller Montage in ganz Deutschland.\n\n✅ Kostenlose Beratung\n✅ Aufmaß vor Ort\n✅ Montage inklusive\n\n👉 Jetzt unverbindlich anfragen!',
        headline: 'Terrassenüberdachung nach Maß',
        link_description: 'Aluminium-Überdachung ab €X — Kostenlose Beratung & Montage in ganz DE',
        cta: 'LEARN_MORE',
        link_url: 'https://polendach24.de',
        image_key: 'terrasse',
    },
    {
        id: 'terrasse-leads',
        name: 'Terrassendach — Lead-Formular',
        objective: 'OUTCOME_LEADS',
        daily_budget: '20',
        description: 'Leady bezpośrednio z Facebook. Formularz: imię, telefon, kod pocztowy, typ zadaszenia.',
        audience_hint: 'Custom Audience: Webseitenbesucher + Lookalike 1-3%, DE',
        ad_copy_hint: '✅ Jetzt unverbindliches Angebot anfordern!',
        tags: ['Leady', 'Terrassendach'],
        color: 'from-blue-500 to-indigo-600',
        icon: '📋',
        season: 'Ganzjährig',
        primary_text: '✅ Jetzt unverbindliches Angebot anfordern!\n\nTerrassenüberdachung nach Maß — inklusive professioneller Montage. Füllen Sie das Formular aus und erhalten Sie Ihr persönliches Angebot innerhalb von 24h.\n\n📍 Kostenloser Service in ganz Deutschland',
        headline: 'Kostenloses Angebot in 24h',
        link_description: 'Formular ausfüllen — Terrassendach nach Maß planen lassen',
        cta: 'GET_QUOTE',
        link_url: 'https://polendach24.de',
        image_key: 'terrasse',
    },
    {
        id: 'carport-leads',
        name: 'Carport Aluminium — Anfragen sammeln',
        objective: 'OUTCOME_LEADS',
        daily_budget: '18',
        description: 'Zbieranie zapytań na carporty aluminiowe. Targetowanie: właściciele domów z garażem/podjazdem.',
        audience_hint: 'Hausbesitzer mit Garage/Einfahrt, 35-60, PLZ-Regionen',
        ad_copy_hint: '🚗 Aluminium Carport — Schutz für Ihr Auto!',
        tags: ['Leady', 'Carport'],
        color: 'from-sky-500 to-blue-600',
        icon: '🚗',
        season: 'Herbst/Winter',
        primary_text: '🚗 Aluminium Carport — Schutz für Ihr Auto das ganze Jahr!\n\nModernes Design, wartungsfrei und extrem langlebig. Schützen Sie Ihr Fahrzeug vor Regen, Schnee und Hagel.\n\n✅ Freistehend oder angebaut\n✅ Individuelle Maße\n✅ Montage inklusive',
        headline: 'Carport aus Aluminium — jetzt planen',
        link_description: 'Kostenlos Carport konfigurieren — inklusive Montage deutschlandweit',
        cta: 'GET_QUOTE',
        link_url: 'https://polendach24.de',
        image_key: 'carport',
    },
    {
        id: 'pergola-premium',
        name: 'Bioklimatische Pergola — Premium',
        objective: 'OUTCOME_TRAFFIC',
        daily_budget: '25',
        description: 'Kampania premium na pergole bioklimatyczne z lamelami. Targetowanie zamożnych klientów, domy 150m²+.',
        audience_hint: 'High-Income, Hausbesitzer 150m²+, Interesse: Luxus, Design, Architektur',
        ad_copy_hint: '🌿 Bioklimatische Pergola — Intelligenter Sonnenschutz mit verstellbaren Lamellen. Premium-Qualität.',
        tags: ['Premium', 'Pergola'],
        color: 'from-purple-500 to-violet-600',
        icon: '🌿',
        season: 'Frühling',
        primary_text: '🌿 Bioklimatische Pergola — Intelligenter Sonnenschutz!\n\nVerstellbare Lamellen für perfekte Licht- und Luftkontrolle. Premium-Aluminium, moderne Architektur.\n\n✅ Automatische Lamellensteuerung\n✅ Wind- und Regensensor\n✅ LED-Beleuchtung optional',
        headline: 'Bioklimatische Pergola — Premium',
        link_description: 'Intelligenter Sonnenschutz mit verstellbaren Lamellen',
        cta: 'LEARN_MORE', link_url: 'https://polendach24.de', image_key: 'pergola',
    },
    {
        id: 'brand-awareness',
        name: 'Polendach24 Markenbekanntheit',
        objective: 'OUTCOME_AWARENESS',
        daily_budget: '10',
        description: 'Budowanie świadomości marki Polendach24 w regionie DACH. Video-Ads z realizacjami.',
        audience_hint: 'Broad: 25-65, DE/AT/CH, Interessen: Hausbau, Immobilien',
        ad_copy_hint: '📢 Polendach24 — Ihr Partner für Aluminium-Überdachungen. 500+ Montagen in Deutschland!',
        tags: ['Branding'],
        color: 'from-amber-500 to-orange-600',
        icon: '📢',
        season: 'Ganzjährig',
        primary_text: '📢 Polendach24 — Ihr Partner für Aluminium-Überdachungen!\n\n500+ erfolgreiche Montagen in Deutschland. Terrassenüberdachungen, Carports & Pergolen nach Maß.\n\n⭐ Top-Bewertungen\n🇩🇪 Deutsche Qualität',
        headline: 'Polendach24 — 500+ Montagen in DE',
        link_description: 'Aluminium-Überdachungen nach Maß — Ihr Partner in Deutschland',
        cta: 'LEARN_MORE', link_url: 'https://polendach24.de', image_key: 'terrasse',
    },
    {
        id: 'social-proof',
        name: 'Kundenbewertungen & Referenzen',
        objective: 'OUTCOME_ENGAGEMENT',
        daily_budget: '10',
        description: 'Social proof — promowanie opinii klientów, zdjęcia realizacji, video-referencje.',
        audience_hint: 'Custom Audience: Webseitenbesucher 30 Tage + Page Fans',
        ad_copy_hint: '⭐⭐⭐⭐⭐ "Perfekte Arbeit, schnelle Montage!" — Sehen Sie, was unsere Kunden sagen',
        tags: ['Social Proof'],
        color: 'from-rose-500 to-pink-600',
        icon: '⭐',
        season: 'Ganzjährig',
        primary_text: '⭐⭐⭐⭐⭐ "Perfekte Arbeit, schnelle Montage, top Qualität!"\n\nSehen Sie, was unsere Kunden über ihre neue Terrassenüberdachung sagen.\n\n🏠 Familie M. aus München\n🚗 Herr K. aus Hamburg\n🌿 Familie S. aus Stuttgart',
        headline: 'Was unsere Kunden sagen',
        link_description: 'Echte Kundenbewertungen — Terrassenüberdachungen & Carports',
        cta: 'LEARN_MORE', link_url: 'https://polendach24.de', image_key: 'terrasse',
    },
    {
        id: 'sommer-aktion',
        name: 'Sommer-Aktion — Terrassendach -15%',
        objective: 'OUTCOME_SALES',
        daily_budget: '30',
        description: 'Kampania sprzedażowa letnia — rabat 15% na zadaszenia z montażem. Limitowana oferta czasowa.',
        audience_hint: 'Retargeting: Webseitenbesucher + Engaged Users + Lookalike',
        ad_copy_hint: '🔥 NUR JETZT: 15% Rabatt auf Terrassenüberdachungen! Inklusive Montage. Angebot endet am [Datum]',
        tags: ['Sprzedaż', 'Rabat'],
        color: 'from-red-500 to-rose-600',
        icon: '🔥',
        season: 'Sommer',
        primary_text: '🔥 NUR JETZT: 15% Rabatt auf Terrassenüberdachungen!\n\nSichern Sie sich Ihre Aluminium-Überdachung zum Sonderpreis. Inklusive professioneller Montage.\n\n⏰ Angebot gültig bis [Datum]\n📞 Jetzt beraten lassen!',
        headline: 'Sommer-Aktion: 15% Rabatt',
        link_description: 'Terrassenüberdachung zum Sonderpreis — nur für kurze Zeit',
        cta: 'SHOP_NOW', link_url: 'https://polendach24.de', image_key: 'terrasse',
    },
    {
        id: 'retargeting',
        name: 'Retargeting — Webseitenbesucher',
        objective: 'OUTCOME_TRAFFIC',
        daily_budget: '8',
        description: 'Retargeting użytkowników strony, którzy nie wysłali zapytania. Niski budżet, wysoka konwersja.',
        audience_hint: 'Custom Audience: Webseitenbesucher 7-30 Tage (ohne Conversions)',
        ad_copy_hint: '👋 Sie haben sich unsere Überdachungen angesehen — Jetzt kostenloses Angebot anfordern!',
        tags: ['Retargeting', 'Konwersja'],
        color: 'from-teal-500 to-cyan-600',
        icon: '🔄',
        season: 'Ganzjährig',
        primary_text: '👋 Sie haben sich unsere Überdachungen angesehen!\n\nSie waren bereits auf unserer Seite — haben Sie noch Fragen? Wir beraten Sie gerne kostenlos und unverbindlich.\n\n👉 Jetzt Angebot anfordern',
        headline: 'Noch Fragen? Wir beraten Sie!',
        link_description: 'Kostenloses Angebot für Ihre Terrassenüberdachung',
        cta: 'CONTACT_US', link_url: 'https://polendach24.de', image_key: 'terrasse',
    },
    {
        id: 'wintergarten-regional',
        name: 'Wintergarten — Regionale Kampagne',
        objective: 'OUTCOME_LEADS',
        daily_budget: '18',
        description: 'Kampania regionalna (Bayern, NRW, Baden-Württemberg) na ogrody zimowe.',
        audience_hint: 'PLZ-Targeting: Bayern, NRW, BW, Hessen — Hausbesitzer 40-65',
        ad_copy_hint: '🏡 Wintergarten aus Aluminium — Genießen Sie Ihren Garten das ganze Jahr! Regionale Montage.',
        tags: ['Regionalna', 'Wintergarten'],
        color: 'from-indigo-500 to-blue-600',
        icon: '🏡',
        season: 'Herbst',
        primary_text: '🏡 Wintergarten aus Aluminium — Genießen Sie Ihren Garten das ganze Jahr!\n\nRegionale Montage in Bayern, NRW, Baden-Württemberg & Hessen.\n\n✅ Wärmeisoliert\n✅ Individuelle Größen\n✅ Montage vom Fachbetrieb',
        headline: 'Wintergarten — regional montiert',
        link_description: 'Aluminium-Wintergarten nach Maß — regionale Montage',
        cta: 'GET_QUOTE', link_url: 'https://polendach24.de', image_key: 'terrasse',
    },
    {
        id: 'video-showcase',
        name: 'Video Showcase — Montage-Zeitraffer',
        objective: 'OUTCOME_ENGAGEMENT',
        daily_budget: '12',
        description: 'Video-kampania z timelapse montażu. Efekt WOW — wysoka viralność, niski koszt za wyświetlenie.',
        audience_hint: 'Broad: 25-55, DE, Video Viewers Retargeting',
        ad_copy_hint: '🎬 Von der Planung bis zur fertigen Überdachung in 60 Sekunden! Sehen Sie unsere Arbeit.',
        tags: ['Video', 'Viral'],
        color: 'from-fuchsia-500 to-purple-600',
        icon: '🎬',
        season: 'Ganzjährig',
        primary_text: '🎬 Von der Planung bis zur fertigen Überdachung in 60 Sekunden!\n\nSehen Sie unsere Arbeit im Zeitraffer. Professionelle Montage, Premium-Qualität.\n\n▶️ Jetzt Video ansehen!',
        headline: 'Montage-Zeitraffer — 60 Sekunden',
        link_description: 'Sehen Sie unsere Arbeit — Aluminium-Überdachungen',
        cta: 'LEARN_MORE', link_url: 'https://polendach24.de', image_key: 'terrasse',
    },
];

// ═══════════════════════════════════════════════════════════
// CAMPAIGNS TAB COMPONENT
// ═══════════════════════════════════════════════════════════

export default function CampaignsTab() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreator, setShowCreator] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'PAUSED'>('all');
    const [generatingAI, setGeneratingAI] = useState(false);
    const [adFormat, setAdFormat] = useState<'single' | 'carousel' | 'collection'>('single');
    const [selectedImages, setSelectedImages] = useState<string[]>(['/fb-terrasse.png']);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [showLibrary, setShowLibrary] = useState(false);
    const [placementMode, setPlacementMode] = useState<'advantage' | 'manual'>('advantage');
    const [placements, setPlacements] = useState({
        facebook_feed: true, facebook_stories: true, facebook_reels: true, facebook_marketplace: false,
        instagram_feed: true, instagram_stories: true, instagram_reels: true, instagram_explore: true,
        messenger_home: false, messenger_stories: false,
    });
    const [targeting, setTargeting] = useState({ countries: ['DE'], age_min: 25, age_max: 65, gender: 0 });
    const [interests, setInterests] = useState<string[]>([]);
    const [targetCities, setTargetCities] = useState<string[]>([]);
    const [createStep, setCreateStep] = useState(0);
    const [adSchedule, setAdSchedule] = useState({ enabled: false, days: [1,2,3,4,5], startHour: 8, endHour: 20 });
    const [alertRules, setAlertRules] = useState({ cpcMax: 2, ctrMin: 1, spendDailyMax: 50, enabled: true });
    const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
    const [campaignDetails, setCampaignDetails] = useState<Record<string, any>>({});
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        name: '', objective: 'OUTCOME_TRAFFIC', daily_budget: '', status: 'PAUSED',
        primary_text: '', headline: '', link_description: '', cta: 'LEARN_MORE',
        link_url: 'https://polendach24.de', image_key: 'terrasse',
    });
    const [creating, setCreating] = useState(false);
    const [customerRegions, setCustomerRegions] = useState<{ plz_prefix: string; region: string; count: number }[]>([]);

    useEffect(() => { loadCampaigns(); loadCustomerRegions(); loadUploadedImages(); }, []);

    const loadUploadedImages = async () => {
        try {
            const { data: files, error } = await supabase.storage.from('media').list('fb-ads', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
            if (error || !files) return;
            const urls = files
                .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
                .map(f => supabase.storage.from('media').getPublicUrl(`fb-ads/${f.name}`).data.publicUrl);
            if (urls.length > 0) setUploadedImages(urls);
        } catch { /* silent */ }
    };

    const PLZ_REGION_MAP: Record<string, string> = {
        '01': 'Dresden', '02': 'Ostsachsen', '03': 'Cottbus', '04': 'Leipzig', '06': 'Halle/SA',
        '07': 'Jena', '08': 'Zwickau', '09': 'Chemnitz', '10': 'Berlin-Mitte', '12': 'Berlin-Süd',
        '13': 'Berlin-Nord', '14': 'Potsdam', '15': 'Frankfurt(O)', '16': 'Oranienburg',
        '17': 'Neubrandenburg', '18': 'Rostock', '19': 'Schwerin', '20': 'Hamburg',
        '21': 'Lüneburg', '22': 'Hamburg-Ost', '23': 'Lübeck', '24': 'Kiel', '25': 'Pinneberg',
        '26': 'Oldenburg', '27': 'Bremen-Nord', '28': 'Bremen', '29': 'Celle',
        '30': 'Hannover', '31': 'Hildesheim', '32': 'Bielefeld', '33': 'Paderborn',
        '34': 'Kassel', '35': 'Gießen', '36': 'Fulda', '37': 'Göttingen',
        '38': 'Braunschweig', '39': 'Magdeburg', '40': 'Düsseldorf', '41': 'Mönchengladbach',
        '42': 'Wuppertal', '44': 'Dortmund', '45': 'Essen', '46': 'Oberhausen',
        '47': 'Duisburg', '48': 'Münster', '49': 'Osnabrück', '50': 'Köln',
        '51': 'Leverkusen', '52': 'Aachen', '53': 'Bonn', '54': 'Trier',
        '55': 'Mainz', '56': 'Koblenz', '57': 'Siegen', '58': 'Hagen',
        '59': 'Hamm', '60': 'Frankfurt/M', '61': 'Bad Homburg', '63': 'Offenbach',
        '64': 'Darmstadt', '65': 'Wiesbaden', '66': 'Saarbrücken', '67': 'Ludwigshafen',
        '68': 'Mannheim', '69': 'Heidelberg', '70': 'Stuttgart', '71': 'Böblingen',
        '72': 'Tübingen', '73': 'Esslingen', '74': 'Heilbronn', '75': 'Pforzheim',
        '76': 'Karlsruhe', '77': 'Offenburg', '78': 'Konstanz', '79': 'Freiburg',
        '80': 'München', '81': 'München-Süd', '82': 'Garmisch', '83': 'Rosenheim',
        '84': 'Landshut', '85': 'Freising', '86': 'Augsburg', '87': 'Kempten',
        '88': 'Ravensburg', '89': 'Ulm', '90': 'Nürnberg', '91': 'Erlangen',
        '92': 'Amberg', '93': 'Regensburg', '94': 'Passau', '95': 'Bayreuth',
        '96': 'Bamberg', '97': 'Würzburg', '98': 'Suhl', '99': 'Erfurt',
    };

    const loadCustomerRegions = async () => {
        try {
            const { data, error } = await supabase.rpc('get_lead_plz_regions').catch(() => ({ data: null, error: 'no rpc' }));
            // Fallback: direct query
            const { data: leads } = await supabase
                .from('leads')
                .select('customer_data')
                .not('customer_data', 'is', null);
            if (!leads) return;
            const regionMap = new Map<string, number>();
            for (const l of leads) {
                const plz = l.customer_data?.postalCode || l.customer_data?.plz || l.customer_data?.PLZ || '';
                if (plz && plz.length >= 2) {
                    const prefix = plz.substring(0, 2);
                    regionMap.set(prefix, (regionMap.get(prefix) || 0) + 1);
                }
            }
            const regions = Array.from(regionMap.entries())
                .map(([prefix, count]) => ({ plz_prefix: prefix, region: PLZ_REGION_MAP[prefix] || `PLZ ${prefix}xxx`, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 15);
            setCustomerRegions(regions);
        } catch { /* silent */ }
    };

    const loadCampaigns = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await FacebookService.getCampaigns();
            setCampaigns(data.data || []);
        } catch (err: any) {
            setError(err.message || 'Nie udało się załadować kampanii');
        }
        finally { setLoading(false); }
    };

    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-700',
        PAUSED: 'bg-yellow-100 text-yellow-700',
        DELETED: 'bg-red-100 text-red-700',
        ARCHIVED: 'bg-slate-100 text-slate-600',
    };

    const objectiveLabels: Record<string, string> = {
        OUTCOME_TRAFFIC: '🌐 Ruch na stronę',
        OUTCOME_ENGAGEMENT: '💬 Zaangażowanie',
        OUTCOME_LEADS: '📋 Leady / Formularze',
        OUTCOME_AWARENESS: '📢 Świadomość marki',
        OUTCOME_SALES: '🛒 Sprzedaż / Konwersje',
        OUTCOME_APP_PROMOTION: '📱 Promocja aplikacji',
    };

    // ═══ FULL PIPELINE: Campaign → Ad Set → Ad ═══
    const handleCreate = async () => {
        if (!newCampaign.name.trim()) return toast.error('Podaj nazwę kampanii');
        if (selectedImages.length === 0) return toast.error('Wybierz przynajmniej jedno zdjęcie');
        setCreating(true);
        setCreateStep(1);
        try {
            // STEP 1: Create Campaign
            toast('📦 Krok 1/3 — Tworzenie kampanii...', { icon: '🔄' });
            const campaignResult = await FacebookService.createCampaign({
                name: newCampaign.name,
                objective: newCampaign.objective,
                status: 'PAUSED', // Always start paused, activate via Ad Set
            });
            const campaignId = campaignResult.id;
            if (!campaignId) throw new Error('Nie udało się utworzyć kampanii');

            // STEP 2: Create Ad Set with placements & targeting
            setCreateStep(2);
            toast('🎯 Krok 2/3 — Ustawienia grupy reklam (umiejscowienia, targetowanie)...', { icon: '🔄' });
            
            const adSetParams: any = {
                campaign_id: campaignId,
                name: `${newCampaign.name} — Ad Set`,
                daily_budget: newCampaign.daily_budget ? Number(newCampaign.daily_budget) : 20,
                optimization_goal: newCampaign.objective === 'OUTCOME_LEADS' ? 'LEAD_GENERATION'
                    : newCampaign.objective === 'OUTCOME_AWARENESS' ? 'REACH'
                    : newCampaign.objective === 'OUTCOME_ENGAGEMENT' ? 'POST_ENGAGEMENT' : 'LINK_CLICKS',
                billing_event: 'IMPRESSIONS',
                status: newCampaign.status || 'PAUSED',
                targeting: {
                    geo_locations: {
                        countries: targeting.countries,
                        ...(targetCities.length > 0 ? { cities: targetCities.map(c => ({ key: c })) } : {}),
                    },
                    age_min: targeting.age_min,
                    age_max: targeting.age_max,
                    ...(targeting.gender !== 0 ? { genders: [targeting.gender] } : {}),
                    ...(interests.length > 0 ? { flexible_spec: [{ interests: interests.map(id => ({ id, name: id })) }] } : {}),
                },
            };

            // Ad schedule (dayparting)
            if (adSchedule.enabled) {
                adSetParams.pacing_type = ['day_parting'];
                adSetParams.adset_schedule = adSchedule.days.map((day: number) => ({
                    start_minute: adSchedule.startHour * 60,
                    end_minute: adSchedule.endHour * 60,
                    days: [day],
                    timezone_type: 'USER',
                }));
            }

            // Manual placements
            if (placementMode === 'manual') {
                const pp: string[] = [];
                const fbPos: string[] = [];
                const igPos: string[] = [];
                const msgPos: string[] = [];
                if (placements.facebook_feed || placements.facebook_stories || placements.facebook_reels || placements.facebook_marketplace) {
                    pp.push('facebook');
                    if (placements.facebook_feed) fbPos.push('feed');
                    if (placements.facebook_stories) fbPos.push('story');
                    if (placements.facebook_reels) fbPos.push('reels');
                    if (placements.facebook_marketplace) fbPos.push('marketplace');
                }
                if (placements.instagram_feed || placements.instagram_stories || placements.instagram_reels || placements.instagram_explore) {
                    pp.push('instagram');
                    if (placements.instagram_feed) igPos.push('stream');
                    if (placements.instagram_stories) igPos.push('story');
                    if (placements.instagram_reels) igPos.push('reels');
                    if (placements.instagram_explore) igPos.push('explore');
                }
                if (placements.messenger_home || placements.messenger_stories) {
                    pp.push('messenger');
                    if (placements.messenger_home) msgPos.push('messenger_home');
                    if (placements.messenger_stories) msgPos.push('story');
                }
                if (pp.length > 0) {
                    adSetParams.publisher_platforms = pp;
                    if (fbPos.length) adSetParams.facebook_positions = fbPos;
                    if (igPos.length) adSetParams.instagram_positions = igPos;
                    if (msgPos.length) adSetParams.messenger_positions = msgPos;
                }
            }

            const adSetResult = await FacebookService.createAdSet(adSetParams);
            const adSetId = adSetResult.id;
            if (!adSetId) throw new Error('Nie udało się utworzyć grupy reklam');

            // STEP 3: Create Ad with creative
            setCreateStep(3);
            toast('🎨 Krok 3/3 — Tworzenie reklamy z kreacją...', { icon: '🔄' });

            const imageUrl = selectedImages[0]?.startsWith('http')
                ? selectedImages[0]
                : `${window.location.origin}${selectedImages[0]}`;

            await FacebookService.createAd({
                adset_id: adSetId,
                name: `${newCampaign.name} — Ad`,
                creative: {
                    link: buildUtmUrl(newCampaign.link_url || 'https://polendach24.de', newCampaign.name),
                    message: newCampaign.primary_text,
                    headline: newCampaign.headline,
                    description: newCampaign.link_description,
                    image_url: imageUrl,
                    cta: newCampaign.cta || 'LEARN_MORE',
                },
                status: newCampaign.status || 'PAUSED',
            });

            toast.success('✅ Kampania + Grupa Reklam + Reklama — wszystko utworzone na Facebooku!');
            setShowCreator(false);
            setCreateStep(0);
            setNewCampaign({ name: '', objective: 'OUTCOME_TRAFFIC', daily_budget: '', status: 'PAUSED', primary_text: '', headline: '', link_description: '', cta: 'LEARN_MORE', link_url: 'https://polendach24.de', image_key: 'terrasse' });
            loadCampaigns();
        } catch (err: any) {
            toast.error('Błąd: ' + err.message);
            setCreateStep(0);
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        try {
            await FacebookService.updateCampaign(campaignId, { status: newStatus });
            toast.success(`Kampania ${newStatus === 'ACTIVE' ? '▶️ aktywowana' : '⏸️ wstrzymana'}`);
            loadCampaigns();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleDeleteCampaign = async (campaignId: string, name: string) => {
        if (!confirm(`Usunąć kampanię "${name}"? Ta operacja ustawi ją jako DELETED na Facebooku.`)) return;
        try {
            await FacebookService.updateCampaign(campaignId, { status: 'DELETED' });
            toast.success('🗑️ Kampania usunięta');
            loadCampaigns();
        } catch (err: any) { toast.error(err.message); }
    };

    // ═══ CLONE CAMPAIGN ═══
    const handleCloneCampaign = (c: any) => {
        const ins = c.insights?.data?.[0] || {};
        setNewCampaign({
            name: `${c.name} — Kopia`,
            objective: c.objective || 'OUTCOME_TRAFFIC',
            daily_budget: c.daily_budget ? String(c.daily_budget / 100) : '20',
            status: 'PAUSED',
            primary_text: '',
            headline: '',
            link_description: '',
            cta: 'LEARN_MORE',
            link_url: 'https://polendach24.de',
            image_key: 'terrasse',
        });
        setSelectedImages(['/fb-terrasse.png']);
        setShowCreator(true);
        setShowTemplates(false);
        toast.success(`📋 Sklonowano "${c.name}" — edytuj i utwórz!`);
    };

    // ═══ UTM BUILDER ═══
    const buildUtmUrl = (baseUrl: string, campaignName: string) => {
        const utm = new URLSearchParams({
            utm_source: 'facebook',
            utm_medium: 'paid_social',
            utm_campaign: campaignName.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_').toLowerCase(),
            utm_content: adFormat,
            utm_term: new Date().toISOString().split('T')[0],
        });
        const sep = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${sep}${utm.toString()}`;
    };

    // ═══ CAMPAIGN DETAILS (LIVE DASHBOARD) ═══
    const loadCampaignDetails = async (campaignId: string) => {
        if (expandedCampaign === campaignId) { setExpandedCampaign(null); return; }
        setExpandedCampaign(campaignId);
        setLoadingDetails(true);
        try {
            const [adSets, ads] = await Promise.all([
                FacebookService.getAdSets(campaignId).catch(() => ({ data: [] })),
                FacebookService.getAds().catch(() => ({ data: [] })),
            ]);
            setCampaignDetails(prev => ({ ...prev, [campaignId]: { adSets: adSets.data || [], ads: ads.data || [] } }));
        } catch (err: any) {
            toast.error('Nie udało się załadować szczegółów: ' + err.message);
        } finally { setLoadingDetails(false); }
    };

    // ═══ ALERT CHECK ═══
    const getCampaignAlerts = (c: any): string[] => {
        if (!alertRules.enabled) return [];
        const ins = c.insights?.data?.[0];
        if (!ins) return [];
        const alerts: string[] = [];
        const cpc = Number(ins.cpc || 0);
        const ctr = Number(ins.ctr || 0);
        const spend = Number(ins.spend || 0);
        if (cpc > alertRules.cpcMax && cpc > 0) alerts.push(`⚠️ CPC €${cpc.toFixed(2)} > €${alertRules.cpcMax}`);
        if (ctr < alertRules.ctrMin && Number(ins.impressions || 0) > 100) alerts.push(`⚠️ CTR ${ctr.toFixed(2)}% < ${alertRules.ctrMin}%`);
        if (spend > alertRules.spendDailyMax) alerts.push(`💸 Spend €${spend.toFixed(2)} > €${alertRules.spendDailyMax}`);
        return alerts;
    };

    const applyTemplate = (tpl: typeof AI_CAMPAIGN_TEMPLATES[0]) => {
        setNewCampaign({
            name: tpl.name,
            objective: tpl.objective,
            daily_budget: tpl.daily_budget,
            status: 'PAUSED',
            primary_text: (tpl.primary_text || '').replace(/\\n/g, '\n'),
            headline: tpl.headline || '',
            link_description: tpl.link_description || '',
            cta: tpl.cta || 'LEARN_MORE',
            link_url: tpl.link_url || 'https://polendach24.de',
            image_key: tpl.image_key || 'terrasse',
        });
        setSelectedImages([AD_IMAGES[tpl.image_key || 'terrasse']]);
        setAdFormat('single');
        setShowTemplates(false);
        setShowCreator(true);
        toast.success('🤖 Szablon zastosowany — edytuj i utwórz kampanię!');
    };

    const toggleImage = (src: string) => {
        setSelectedImages(prev => {
            if (prev.includes(src)) return prev.filter(s => s !== src);
            if (adFormat === 'single') return [src];
            if (adFormat === 'collection' && prev.length >= 4) { toast('Max 4 zdjęcia dla kolaża'); return prev; }
            if (prev.length >= 10) { toast('Max 10 zdjęć w karuzeli'); return prev; }
            return [...prev, src];
        });
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) { toast.error('Max 5MB'); return; }
        try {
            const fileName = `fb-ads/${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from('media').upload(fileName, file, { contentType: file.type, upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
            const url = urlData.publicUrl;
            setUploadedImages(prev => [url, ...prev]);
            setSelectedImages(prev => adFormat === 'single' ? [url] : [...prev, url]);
            toast.success('📸 Zdjęcie dodane!');
        } catch (err: any) {
            toast.error('Upload error: ' + err.message);
        }
        e.target.value = '';
    };

    const generateAICampaignName = async () => {
        setGeneratingAI(true);
        try {
            const { data } = await supabase.functions.invoke('morning-coffee-ai', {
                body: {
                    analysis_type: 'fb_post_generator',
                    topic: `Generiere einen kreativen, deutschen Kampagnennamen für Facebook Ads. 
                    Branche: Aluminium-Terrassenüberdachungen, Carports, Pergolen in Deutschland.
                    Ziel: ${objectiveLabels[newCampaign.objective] || 'Traffic'}.
                    Format: Nur den Kampagnennamen, maximal 60 Zeichen, mit einem passenden Emoji am Anfang.
                    Beispiele: "🏠 Traumterrasse 2026 — Jetzt planen!", "🚗 Carport-Aktion Frühjahr", "🌿 Premium Pergola DE"`,
                },
            });
            const name = (data?.content || data?.result || '')
                .replace(/[*#"]/g, '').trim().split('\n')[0].trim();
            if (name) {
                setNewCampaign(p => ({ ...p, name }));
                toast.success('🤖 AI Name generiert!');
            }
        } catch (err: any) {
            toast.error('AI Fehler: ' + err.message);
        } finally { setGeneratingAI(false); }
    };

    // ═══ AI FULL CAMPAIGN GENERATOR (A-Z) ═══
    const generateAICampaignFull = async () => {
        setGeneratingAI(true);
        toast.loading('🤖 AI generiert eine komplette Kampagne...', { id: 'ai-full', duration: 15000 });
        try {
            const now = new Date();
            const month = now.toLocaleString('de-DE', { month: 'long' });
            const year = now.getFullYear();
            const season = (() => {
                const m = now.getMonth();
                if (m >= 2 && m <= 4) return 'Frühling — Hochsaison für Terrassenüberdachungen! Kunden planen jetzt für den Sommer.';
                if (m >= 5 && m <= 7) return 'Sommer — Montage-Saison läuft! Kunden wollen schnell bestellen.';
                if (m >= 8 && m <= 9) return 'Herbst — Carport-Saison! Kunden schützen ihr Auto vor Regen und Schnee.';
                return 'Winter — Planungsphase. Wintergärten und Frühbucher-Aktionen.';
            })();

            const topRegions = customerRegions.slice(0, 8).map(r => `${r.region} (${r.count} Leads)`).join(', ');
            const totalLeads = customerRegions.reduce((s, r) => s + r.count, 0);
            
            const imageOptions = STOCK_IMAGES.map(i => `${i.key}: ${i.label}`).join(', ');

            const prompt = `Du bist ein Top-Facebook-Ads-Experte bei einer Premium-Agentur. Erstelle eine KOMPLETTE Facebook-Kampagne für folgendes Unternehmen:

UNTERNEHMEN: Polendach24 — Premium Aluminium-Überdachungen, Carports, Pergolen & Wintergärten in Deutschland.
ZIELGRUPPE: Hauseigentümer in Deutschland (30-65 Jahre), mittleres bis hohes Einkommen.
USP: Polnische Premium-Qualität, deutsche Montage, individuelle Maße, alles aus einer Hand, 500+ Montagen.
WEBSITE: https://polendach24.de

DATUM: ${month} ${year}
SAISON: ${season}

CRM-DATEN (${totalLeads} Leads mit PLZ):
Top-Regionen: ${topRegions || 'Ostdeutschland (Sachsen, Brandenburg, Berlin)'}

VERFÜGBARE BILDER: ${imageOptions}

Antworte NUR als JSON (ohne Markdown-Codeblocks). Exakt dieses Format:
{
  "name": "Kampagnenname mit Emoji (max 60 Zeichen, deutsch)",
  "objective": "OUTCOME_LEADS oder OUTCOME_TRAFFIC",
  "daily_budget": "Tagesbudget in EUR als Zahl (15-50)",
  "primary_text": "Haupttext der Anzeige (deutsch, 3-5 Absätze, mit Emojis, Bulletpoints ✅, Zeilenumbrüche als \\n)",
  "headline": "Anzeigen-Headline (max 40 Zeichen, deutsch, packend)",
  "link_description": "Link-Beschreibung (max 100 Zeichen)",
  "cta": "LEARN_MORE oder GET_QUOTE oder CONTACT_US",
  "image_key": "einer von: terrasse, terrasse-night, carport, pergola, wintergarten, montage",
  "targeting_hint": "Kurze Targeting-Empfehlung deutsch",
  "strategy_note": "2-3 Sätze warum diese Kampagne jetzt funktioniert"
}

Erstelle DIE BESTE MÖGLICHE Kampagne basierend auf: aktuellem Monat, Saison, CRM-Regionen und bewährten Facebook-Ads-Strategien für die Baubranche.`;

            const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
                body: { analysis_type: 'fb_post_generator', topic: prompt },
            });

            const raw = data?.content || data?.result || '';
            // Parse JSON from response (handle possible markdown code blocks)
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('AI nie zwróciło poprawnego wyniku');

            const ai = JSON.parse(jsonMatch[0]);

            // Auto-fill everything
            setNewCampaign({
                name: ai.name || '🏠 AI Kampagne',
                objective: ai.objective || 'OUTCOME_LEADS',
                daily_budget: String(ai.daily_budget || '20'),
                status: 'PAUSED',
                primary_text: (ai.primary_text || '').replace(/\\n/g, '\n'),
                headline: ai.headline || '',
                link_description: ai.link_description || '',
                cta: ai.cta || 'GET_QUOTE',
                link_url: 'https://polendach24.de',
                image_key: ai.image_key || 'terrasse',
            });

            // Set image
            const imgSrc = AD_IMAGES[ai.image_key || 'terrasse'] || '/fb-terrasse.png';
            setSelectedImages([imgSrc]);
            setAdFormat('single');

            // Auto-select interests for home/garden
            setInterests(['6003349442621', '6003384248805', '6003020834693', '6003337506837', '6003277229371']);
            setTargeting({ countries: ['DE'], age_min: 30, age_max: 65, gender: 0 });

            setShowCreator(true);
            setShowTemplates(false);

            toast.dismiss('ai-full');
            toast.success('✨ AI stworzyło kampanię od A-Z! Sprawdź i kliknij Utwórz.', { duration: 5000 });

            // Show strategy note
            if (ai.strategy_note) {
                setTimeout(() => toast(ai.strategy_note, { icon: '💡', duration: 8000 }), 1500);
            }
            if (ai.targeting_hint) {
                setTimeout(() => toast(`🎯 Targeting: ${ai.targeting_hint}`, { duration: 8000 }), 3000);
            }

        } catch (err: any) {
            toast.dismiss('ai-full');
            toast.error('AI Fehler: ' + err.message);
        } finally { setGeneratingAI(false); }
    };


    const filtered = filter === 'all'
        ? campaigns.filter(c => c.status !== 'DELETED')
        : campaigns.filter(c => c.status === filter);
    const activeCnt = campaigns.filter(c => c.status === 'ACTIVE').length;
    const pausedCnt = campaigns.filter(c => c.status === 'PAUSED').length;
    const totalSpend = campaigns.reduce((s, c) => s + Number(c.insights?.data?.[0]?.spend || 0), 0);
    const totalReach = campaigns.reduce((s, c) => s + Number(c.insights?.data?.[0]?.reach || 0), 0);

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-5 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-60" />
                <div className="relative">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-xl font-bold">🎯 Kampanie reklamowe</h2>
                            <p className="text-blue-100 text-sm mt-1">Aluminium-Überdachungen • Deutscher Markt • Polendach24</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={loadCampaigns} className="px-3 py-2 bg-white/10 backdrop-blur text-white rounded-lg text-xs font-medium hover:bg-white/20 border border-white/20">🔄</button>
                            <button
                                onClick={generateAICampaignFull}
                                disabled={generatingAI}
                                className="px-3 py-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-lg text-xs font-bold hover:from-emerald-500 hover:to-teal-600 shadow-lg disabled:opacity-50 animate-pulse hover:animate-none border border-emerald-300/50"
                            >
                                {generatingAI ? '⏳ AI generuje...' : '✨ AI Stwórz kampanię A-Z'}
                            </button>
                            <button onClick={() => { setShowTemplates(!showTemplates); setShowCreator(false); }} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 shadow-lg">
                                🤖 AI Szablony
                            </button>
                            <button onClick={() => { setShowCreator(!showCreator); setShowTemplates(false); }} className="px-3 py-2 bg-white text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 shadow-lg">
                                ➕ Nowa kampania
                            </button>
                        </div>
                    </div>
                    {/* Stats row */}
                    {campaigns.length > 0 && (
                        <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
                            <div>
                                <p className="text-2xl font-bold">{campaigns.length}</p>
                                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Kampanii</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-300">{activeCnt}</p>
                                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Aktywnych</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-300">{pausedCnt}</p>
                                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Wstrzymanych</p>
                            </div>
                            {totalSpend > 0 && <div>
                                <p className="text-2xl font-bold">€{totalSpend.toFixed(0)}</p>
                                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Łącznie wydano</p>
                            </div>}
                            {totalReach > 0 && <div>
                                <p className="text-2xl font-bold">{totalReach.toLocaleString()}</p>
                                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Zasięg łączny</p>
                            </div>}
                        </div>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-bold text-red-800">❌ Błąd ładowania kampanii</p>
                        <p className="text-xs text-red-700 mt-1">{error}</p>
                    </div>
                    <button onClick={loadCampaigns} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 ml-3">🔄 Ponów</button>
                </div>
            )}

            {/* ═══════════ CUSTOMER REGIONS INTELLIGENCE ═══════════ */}
            {customerRegions.length > 0 && !showCreator && !showTemplates && (
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl border border-indigo-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                                📊
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-indigo-900">Heatmapa klientów — dane z CRM</h3>
                                <p className="text-[10px] text-indigo-500">Twoje regiony wg liczby leadów. Używaj do targetowania Facebook Ads.</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-indigo-700">{customerRegions.reduce((s, r) => s + r.count, 0)}</p>
                            <p className="text-[9px] text-indigo-400 uppercase tracking-wider">Leadów z PLZ</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {customerRegions.slice(0, 15).map((r, i) => {
                            const maxCount = customerRegions[0]?.count || 1;
                            const pct = Math.round((r.count / maxCount) * 100);
                            return (
                                <div key={r.plz_prefix} className="relative bg-white rounded-xl px-3 py-2.5 border border-indigo-100 overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 rounded-b-xl" style={{ height: `${pct}%` }} />
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                i < 3 ? 'bg-indigo-600 text-white' : i < 6 ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                                            </span>
                                            <span className="text-xs font-bold text-indigo-700">{r.count}</span>
                                        </div>
                                        <p className="text-[11px] font-semibold text-slate-700 leading-tight">{r.region}</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">PLZ {r.plz_prefix}xxx</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-4 bg-white/70 rounded-xl p-3 border border-indigo-100">
                        <div className="flex-1">
                            <p className="text-[10px] text-indigo-600">
                                💡 <strong>Główny rynek:</strong> Ostdeutschland (Sachsen, Brandenburg, Berlin, Sachsen-Anhalt).
                                <strong> Ekspansja:</strong> NRW, Bayern, Hamburg — nowe tereny z potencjałem.
                            </p>
                        </div>
                        <button
                            onClick={() => { setShowCreator(true); setShowTemplates(false); }}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shadow-sm"
                        >
                            🎯 Utwórz kampanię z tych regionów
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════ AI CAMPAIGN TEMPLATES ═══════════ */}
            {showTemplates && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">🤖</span>
                                AI Kampagnen-Vorlagen
                            </h3>
                            <p className="text-xs text-amber-700 mt-1">Gotowe szablony zoptymalizowane pod <strong>zadaszenia aluminiowe w Niemczech</strong>. Kliknij aby użyć.</p>
                        </div>
                        <button onClick={() => setShowTemplates(false)} className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 hover:bg-amber-300 flex items-center justify-center text-sm font-bold">✕</button>
                    </div>

                    {/* Season filter hint */}
                    <div className="flex gap-2 flex-wrap">
                        {['Ganzjährig', 'Frühling', 'Frühling/Sommer', 'Sommer', 'Herbst', 'Herbst/Winter'].map(s => (
                            <span key={s} className="text-[10px] bg-white text-amber-700 px-2 py-1 rounded-full border border-amber-200">{s}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AI_CAMPAIGN_TEMPLATES.map((tpl) => (
                            <button
                                key={tpl.id}
                                onClick={() => applyTemplate(tpl)}
                                className="bg-white rounded-xl p-4 text-left hover:shadow-lg transition-all border border-slate-200 hover:border-amber-400 group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                                        <span className="text-xl">{tpl.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors">{tpl.name}</p>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tpl.description}</p>

                                        {/* Audience hint */}
                                        <div className="bg-blue-50 rounded-lg px-2.5 py-1.5 mt-2">
                                            <p className="text-[10px] text-blue-600"><strong>🎯 Grupa docelowa:</strong> {tpl.audience_hint}</p>
                                        </div>

                                        {/* Ad copy hint */}
                                        <div className="bg-green-50 rounded-lg px-2.5 py-1.5 mt-1.5">
                                            <p className="text-[10px] text-green-700"><strong>📝 Tekst reklamy:</strong> {tpl.ad_copy_hint}</p>
                                        </div>

                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">€{tpl.daily_budget}/dzień</span>
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{objectiveLabels[tpl.objective]?.split(' ').slice(1).join(' ')}</span>
                                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">📅 {tpl.season}</span>
                                            {tpl.tags.map(tag => (
                                                <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Pro tips */}
                    <div className="bg-white/80 rounded-xl p-4 border border-amber-200">
                        <p className="text-xs font-bold text-amber-800 mb-2">💡 Wskazówki kampanii — Aluminium Überdachungen DE:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-amber-700">
                            <p>• <strong>Najlepszy CPC:</strong> €0.15–0.40 dla ruchu, €1–3 dla leadów</p>
                            <p>• <strong>Sezon:</strong> Marzec–Czerwiec = peak season, niższe CPL</p>
                            <p>• <strong>Grupa 1:</strong> Hausbesitzer 35-55, Einkommen &gt;40k, Terrasse/Garten</p>
                            <p>• <strong>Grupa 2:</strong> Retargeting webseitenbesucher (7-30 dni)</p>
                            <p>• <strong>Format:</strong> Karuzela zdjęć realizacji = najlepszy CTR</p>
                            <p>• <strong>Video:</strong> Timelapse montażu 15-30s = niski CPM, wysoki reach</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ CAMPAIGN CREATOR + LIVE PREVIEW ═══════════ */}
            {showCreator && (
                <div className="bg-white rounded-2xl shadow-lg border border-blue-200 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm">➕</span>
                            Utwórz kampanię z reklamą
                        </h3>
                        <button onClick={() => setShowCreator(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm">✕</button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT: Form fields */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">📋 Ustawienia kampanii</p>

                            {/* Name + AI */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Nazwa kampanii</label>
                                <div className="flex gap-2">
                                    <input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} placeholder="np. Terrassenüberdachung 2026" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                                    <button onClick={generateAICampaignName} disabled={generatingAI} className="px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-md">
                                        {generatingAI ? '⏳...' : '🤖 AI'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Cel</label>
                                    <select value={newCampaign.objective} onChange={e => setNewCampaign(p => ({ ...p, objective: e.target.value }))} className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none">
                                        {Object.entries(objectiveLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Budżet €/dzień</label>
                                    <input type="number" value={newCampaign.daily_budget} onChange={e => setNewCampaign(p => ({ ...p, daily_budget: e.target.value }))} placeholder="20" className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
                                    <select value={newCampaign.status} onChange={e => setNewCampaign(p => ({ ...p, status: e.target.value }))} className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none">
                                        <option value="PAUSED">⏸️ Wstrzymana</option>
                                        <option value="ACTIVE">▶️ Aktywna</option>
                                    </select>
                                </div>
                            </div>

                            {/* ═══ PLACEMENTS & TARGETING ═══ */}
                            <hr className="border-slate-100" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">📍 Umiejscowienia i targetowanie</p>

                            {/* Placement mode */}
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPlacementMode('advantage')}
                                    className={`p-2 rounded-lg border text-left transition-all ${placementMode === 'advantage' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <p className="text-xs font-bold text-slate-700">🚀 Advantage+ (Zalecane)</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Facebook AI optymalizuje umiejscowienia automatycznie</p>
                                </button>
                                <button onClick={() => setPlacementMode('manual')}
                                    className={`p-2 rounded-lg border text-left transition-all ${placementMode === 'manual' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <p className="text-xs font-bold text-slate-700">🎯 Manualne</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Ty decydujesz: FB, IG, Reels, Stories, Messenger...</p>
                                </button>
                            </div>

                            {/* Manual placement checkboxes */}
                            {placementMode === 'manual' && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 mb-1">📘 Facebook</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                            {[
                                                { key: 'facebook_feed', label: 'Feed' },
                                                { key: 'facebook_stories', label: 'Stories' },
                                                { key: 'facebook_reels', label: 'Reels' },
                                                { key: 'facebook_marketplace', label: 'Marketplace' },
                                            ].map(p => (
                                                <label key={p.key} className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                                                    <input type="checkbox" checked={(placements as any)[p.key]} onChange={e => setPlacements(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                                        className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
                                                    {p.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-pink-600 mb-1">📸 Instagram</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                            {[
                                                { key: 'instagram_feed', label: 'Feed' },
                                                { key: 'instagram_stories', label: 'Stories' },
                                                { key: 'instagram_reels', label: 'Reels' },
                                                { key: 'instagram_explore', label: 'Explore' },
                                            ].map(p => (
                                                <label key={p.key} className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                                                    <input type="checkbox" checked={(placements as any)[p.key]} onChange={e => setPlacements(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                                        className="w-3 h-3 rounded border-slate-300 text-pink-600 focus:ring-pink-400" />
                                                    {p.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-purple-600 mb-1">💬 Messenger</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                            {[
                                                { key: 'messenger_home', label: 'Skrzynka' },
                                                { key: 'messenger_stories', label: 'Stories' },
                                            ].map(p => (
                                                <label key={p.key} className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                                                    <input type="checkbox" checked={(placements as any)[p.key]} onChange={e => setPlacements(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                                        className="w-3 h-3 rounded border-slate-300 text-purple-600 focus:ring-purple-400" />
                                                    {p.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Targeting */}
                            <div className="grid grid-cols-4 gap-2">
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">🌍 Kraj</label>
                                    <select value={targeting.countries[0]} onChange={e => setTargeting(p => ({ ...p, countries: [e.target.value] }))} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] focus:ring-2 focus:ring-blue-400 focus:outline-none">
                                        <option value="DE">🇩🇪 Niemcy</option>
                                        <option value="AT">🇦🇹 Austria</option>
                                        <option value="CH">🇨🇭 Szwajcaria</option>
                                        <option value="PL">🇵🇱 Polska</option>
                                        <option value="NL">🇳🇱 Holandia</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">👤 Wiek od</label>
                                    <input type="number" value={targeting.age_min} min={18} max={65} onChange={e => setTargeting(p => ({ ...p, age_min: Number(e.target.value) }))} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">👤 Wiek do</label>
                                    <input type="number" value={targeting.age_max} min={18} max={65} onChange={e => setTargeting(p => ({ ...p, age_max: Number(e.target.value) }))} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">⚧️ Płeć</label>
                                    <select value={targeting.gender} onChange={e => setTargeting(p => ({ ...p, gender: Number(e.target.value) }))} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] focus:ring-2 focus:ring-blue-400 focus:outline-none">
                                        <option value={0}>Wszyscy</option>
                                        <option value={1}>Mężczyźni</option>
                                        <option value={2}>Kobiety</option>
                                    </select>
                                </div>
                            </div>

                            {/* Advanced targeting: Interests */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 mb-1">🎯 Zainteresowania (im więcej, tym szerszy zasięg):</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: '6003349442621', name: 'Hausbau' },
                                        { id: '6003384248805', name: 'Garten' },
                                        { id: '6003020834693', name: 'Immobilien' },
                                        { id: '6003337506837', name: 'Renovierung' },
                                        { id: '6003277229371', name: 'Eigenheim' },
                                        { id: '6003139266461', name: 'Interior Design' },
                                        { id: '6003604094503', name: 'Architektur' },
                                        { id: '6003397425735', name: 'Terrasse' },
                                        { id: '6003348513910', name: 'DIY / Heimwerker' },
                                        { id: '6003305411556', name: 'Wohnung & Haus' },
                                    ].map(int => (
                                        <button key={int.id} onClick={() => setInterests(prev =>
                                            prev.includes(int.id) ? prev.filter(i => i !== int.id) : [...prev, int.id]
                                        )}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                                                interests.includes(int.id)
                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
                                            }`}>
                                            {int.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced targeting: Cities */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 mb-1">🏙️ Miasta (opcjonalnie — zostaw puste dla całego kraju):</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { key: '2950159', name: 'Berlin' },
                                        { key: '2867714', name: 'München' },
                                        { key: '2911298', name: 'Hamburg' },
                                        { key: '2886242', name: 'Köln' },
                                        { key: '2925533', name: 'Frankfurt' },
                                        { key: '2825297', name: 'Stuttgart' },
                                        { key: '2934246', name: 'Düsseldorf' },
                                        { key: '2867543', name: 'Nürnberg' },
                                        { key: '2842647', name: 'Hannover' },
                                        { key: '2861650', name: 'Dresden' },
                                        { key: '2879139', name: 'Leipzig' },
                                        { key: '2812482', name: 'Bremen' },
                                    ].map(city => (
                                        <button key={city.key} onClick={() => setTargetCities(prev =>
                                            prev.includes(city.key) ? prev.filter(c => c !== city.key) : [...prev, city.key]
                                        )}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                                                targetCities.includes(city.key)
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300'
                                            }`}>
                                            📍 {city.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ═══ CUSTOMER REGIONS HEATMAP ═══ */}
                            {customerRegions.length > 0 && (
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                                                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px]">📊</span>
                                                Heatmapa klientów (dane z CRM)
                                            </p>
                                            <p className="text-[9px] text-indigo-500 mt-0.5">Regiony z największą liczbą leadów — kieruj reklamy tam, gdzie masz klientów + nowe tereny</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Auto-select top 5 regions as targeting
                                                const topRegions = customerRegions.slice(0, 5).map(r => r.region);
                                                toast.success(`🎯 Załadowano Top 5 regionów z CRM: ${topRegions.join(', ')}`);
                                            }}
                                            className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                                        >
                                            🎯 Zastosuj Top 5
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                        {customerRegions.slice(0, 12).map((r, i) => {
                                            const maxCount = customerRegions[0]?.count || 1;
                                            const pct = Math.round((r.count / maxCount) * 100);
                                            return (
                                                <div key={r.plz_prefix} className="relative bg-white rounded-lg px-2.5 py-2 border border-indigo-100 overflow-hidden group">
                                                    <div className="absolute inset-0 bg-indigo-500/10 rounded-lg" style={{ width: `${pct}%` }} />
                                                    <div className="relative flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                                i < 3 ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                                {r.plz_prefix}xxx
                                                            </span>
                                                            <span className="text-[10px] font-medium text-slate-700">{r.region}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${i < 3 ? 'text-indigo-700' : 'text-slate-500'}`}>{r.count}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[9px] text-indigo-400 text-center">
                                        💡 Tip: Twoim głównym rynkiem jest Ostdeutschland (Sachsen, Brandenburg, Berlin). Rozważ ekspansję na NRW / Bayern.
                                    </p>
                                </div>
                            )}

                            {/* ═══ AD SCHEDULE ═══ */}
                            <hr className="border-slate-100" />
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">⏰ Harmonogram wyświetlania</p>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={adSchedule.enabled} onChange={e => setAdSchedule(p => ({ ...p, enabled: e.target.checked }))}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
                                    <span className="text-[10px] text-slate-500">{adSchedule.enabled ? 'Włączony' : 'Wyłączony (24/7)'}</span>
                                </label>
                            </div>
                            {adSchedule.enabled && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-600 mb-1">📅 Dni tygodnia:</p>
                                        <div className="flex gap-1">
                                            {[{d: 1, l: 'Pn'}, {d: 2, l: 'Wt'}, {d: 3, l: 'Śr'}, {d: 4, l: 'Cz'}, {d: 5, l: 'Pt'}, {d: 6, l: 'So'}, {d: 0, l: 'Nd'}].map(day => (
                                                <button key={day.d} onClick={() => setAdSchedule(p => ({
                                                    ...p, days: p.days.includes(day.d) ? p.days.filter(d => d !== day.d) : [...p.days, day.d]
                                                }))}
                                                    className={`w-8 h-7 rounded text-[10px] font-bold transition-colors ${adSchedule.days.includes(day.d) ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                                    {day.l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-500">Od godziny:</label>
                                            <input type="number" min={0} max={23} value={adSchedule.startHour} onChange={e => setAdSchedule(p => ({ ...p, startHour: Number(e.target.value) }))}
                                                className="w-full px-2 py-1 rounded border border-slate-200 text-[10px]" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500">Do godziny:</label>
                                            <input type="number" min={0} max={23} value={adSchedule.endHour} onChange={e => setAdSchedule(p => ({ ...p, endHour: Number(e.target.value) }))}
                                                className="w-full px-2 py-1 rounded border border-slate-200 text-[10px]" />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400">💡 Reklamy wyświetlane {adSchedule.startHour}:00–{adSchedule.endHour}:00 w wybrane dni. Strefa czasowa użytkownika.</p>
                                </div>
                            )}

                            {/* ═══ UTM PREVIEW ═══ */}
                            {newCampaign.name && (
                                <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                                    <p className="text-[10px] font-bold text-emerald-700 mb-1">🔗 UTM Tracking (automatyczny)</p>
                                    <p className="text-[9px] text-emerald-600 font-mono break-all leading-relaxed">
                                        {buildUtmUrl(newCampaign.link_url || 'https://polendach24.de', newCampaign.name)}
                                    </p>
                                </div>
                            )}

                            {/* ═══ ALERT RULES ═══ */}
                            <div className="bg-orange-50 rounded-lg p-2.5 border border-orange-200">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] font-bold text-orange-700">🚨 Auto-alerty wydajności</p>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" checked={alertRules.enabled} onChange={e => setAlertRules(p => ({ ...p, enabled: e.target.checked }))}
                                            className="w-3 h-3 rounded border-orange-300 text-orange-600 focus:ring-orange-400" />
                                        <span className="text-[9px] text-orange-500">{alertRules.enabled ? 'Aktywne' : 'Wyłączone'}</span>
                                    </label>
                                </div>
                                {alertRules.enabled && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[9px] text-orange-600">CPC max (€)</label>
                                            <input type="number" step="0.5" value={alertRules.cpcMax} onChange={e => setAlertRules(p => ({ ...p, cpcMax: Number(e.target.value) }))}
                                                className="w-full px-2 py-1 rounded border border-orange-200 text-[10px]" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-orange-600">CTR min (%)</label>
                                            <input type="number" step="0.1" value={alertRules.ctrMin} onChange={e => setAlertRules(p => ({ ...p, ctrMin: Number(e.target.value) }))}
                                                className="w-full px-2 py-1 rounded border border-orange-200 text-[10px]" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-orange-600">Spend max (€/d)</label>
                                            <input type="number" step="5" value={alertRules.spendDailyMax} onChange={e => setAlertRules(p => ({ ...p, spendDailyMax: Number(e.target.value) }))}
                                                className="w-full px-2 py-1 rounded border border-orange-200 text-[10px]" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="border-slate-100" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">📝 Kreacja reklamowa</p>

                            {/* Ad Format picker */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Format reklamy</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {AD_FORMATS.map(f => (
                                        <button key={f.value} onClick={() => { setAdFormat(f.value as any); if (f.value === 'single') setSelectedImages(prev => prev.slice(0, 1)); }}
                                            className={`p-2 rounded-lg border text-left transition-all ${adFormat === f.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <p className="text-xs font-bold text-slate-700">{f.label}</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Primary text */}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tekst główny reklamy (DE)</label>
                                <textarea value={newCampaign.primary_text} onChange={e => setNewCampaign(p => ({ ...p, primary_text: e.target.value }))} rows={4} placeholder="🏠 Ihre Traumterrasse wartet!&#10;&#10;Aluminium-Terrassenüberdachung nach Maß..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Nagłówek</label>
                                    <input value={newCampaign.headline} onChange={e => setNewCampaign(p => ({ ...p, headline: e.target.value }))} placeholder="Terrassenüberdachung nach Maß" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Opis pod linkiem</label>
                                    <input value={newCampaign.link_description} onChange={e => setNewCampaign(p => ({ ...p, link_description: e.target.value }))} placeholder="Kostenlose Beratung & Montage" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Przycisk CTA</label>
                                    <select value={newCampaign.cta} onChange={e => setNewCampaign(p => ({ ...p, cta: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
                                        {CTA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Link docelowy</label>
                                    <input value={newCampaign.link_url} onChange={e => setNewCampaign(p => ({ ...p, link_url: e.target.value }))} placeholder="https://polendach24.de" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                                </div>
                            </div>

                            {/* ═══ IMAGE LIBRARY ═══ */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-600">
                                        📸 Zdjęcia ({selectedImages.length} wybrano{adFormat === 'carousel' ? ', max 10' : adFormat === 'collection' ? ', max 4' : ''})
                                    </label>
                                    <label className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:opacity-90 shadow-sm">
                                        ⬆️ Dodaj własne zdjęcie
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                                    </label>
                                </div>

                                {/* Stock images grid */}
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    {STOCK_IMAGES.map(img => {
                                        const isSelected = selectedImages.includes(img.src);
                                        const idx = selectedImages.indexOf(img.src);
                                        return (
                                            <button key={img.key} onClick={() => toggleImage(img.src)}
                                                className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[4/3] group ${isSelected ? 'border-blue-500 ring-2 ring-blue-300 shadow-md' : 'border-slate-200 hover:border-slate-400'}`}>
                                                <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                                                <div className={`absolute inset-0 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500/20' : 'bg-black/0 group-hover:bg-black/10'}`}>
                                                    {isSelected && (
                                                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                                                            {adFormat === 'single' ? '✓' : idx + 1}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1.5 py-0.5 truncate">{img.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Uploaded images */}
                                {uploadedImages.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-semibold mb-1">Twoje zdjęcia:</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {uploadedImages.map((url, i) => {
                                                const isSelected = selectedImages.includes(url);
                                                const idx = selectedImages.indexOf(url);
                                                return (
                                                    <button key={i} onClick={() => toggleImage(url)}
                                                        className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[4/3] group ${isSelected ? 'border-green-500 ring-2 ring-green-300 shadow-md' : 'border-slate-200 hover:border-slate-400'}`}>
                                                        <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                                                        <div className={`absolute inset-0 flex items-center justify-center transition-all ${isSelected ? 'bg-green-500/20' : 'bg-black/0 group-hover:bg-black/10'}`}>
                                                            {isSelected && (
                                                                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                                                                    {adFormat === 'single' ? '✓' : idx + 1}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1.5 py-0.5">📤 Upload {i + 1}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={handleCreate} disabled={creating} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200 text-sm">
                                    {creating ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {createStep === 1 ? 'Kampania...' : createStep === 2 ? 'Ad Set...' : 'Reklama...'} ({createStep}/3)</> : <>🚀 Utwórz kampanię + reklamę</>}
                                </button>
                                <button onClick={() => { setShowTemplates(true); setShowCreator(false); }} className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 text-sm">
                                    🤖 Szablony
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: Live Facebook Ad Preview */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                👁️ Podgląd: {AD_FORMATS.find(f => f.value === adFormat)?.label || 'Pojedyncze zdjęcie'}
                            </p>
                            <div className="bg-white rounded-xl border border-slate-300 shadow-md max-w-[400px] mx-auto overflow-hidden">
                                {/* FB Post header */}
                                <div className="px-4 pt-3 pb-2 flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">P24</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-slate-900 leading-tight">Polendach24</p>
                                        <p className="text-[11px] text-slate-400 flex items-center gap-1">Sponsored · 🌍</p>
                                    </div>
                                    <span className="text-slate-300 text-lg">···</span>
                                </div>

                                {/* Primary text */}
                                <div className="px-4 pb-2">
                                    <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
                                        {newCampaign.primary_text || '(Tekst główny reklamy — wypełnij po lewej lub użyj szablonu AI)'}
                                    </p>
                                </div>

                                {/* ════ FORMAT-SPECIFIC IMAGE DISPLAY ════ */}
                                {adFormat === 'single' && (
                                    <div className="relative">
                                        <img src={selectedImages[0] || '/fb-terrasse.png'} alt="Ad preview" className="w-full h-52 object-cover" />
                                    </div>
                                )}

                                {adFormat === 'carousel' && (
                                    <div className="relative">
                                        <div className="flex overflow-x-auto snap-x snap-mandatory gap-0" style={{ scrollbarWidth: 'none' }}>
                                            {(selectedImages.length > 0 ? selectedImages : ['/fb-terrasse.png']).map((src, i) => (
                                                <div key={i} className="flex-shrink-0 w-[75%] snap-start relative">
                                                    <img src={src} alt={`Card ${i + 1}`} className="w-full h-48 object-cover" />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-white/95 px-3 py-2 border-t">
                                                        <p className="text-[11px] font-bold text-slate-800 truncate">{newCampaign.headline || 'Nagłówek'} {i > 0 ? `(${i + 1})` : ''}</p>
                                                        <p className="text-[9px] text-slate-400 truncate">{newCampaign.link_description || 'Opis linku'}</p>
                                                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-bold">{CTA_OPTIONS.find(o => o.value === newCampaign.cta)?.label || 'Mehr erfahren'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="absolute top-1/2 right-1 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-slate-500 text-xs">›</div>
                                        <div className="flex items-center justify-center gap-1 py-1.5 bg-white">
                                            {selectedImages.map((_, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-slate-300'}`} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {adFormat === 'collection' && (
                                    <div className="relative">
                                        <img src={selectedImages[0] || '/fb-terrasse.png'} alt="Main" className="w-full h-40 object-cover" />
                                        {selectedImages.length > 1 && (
                                            <div className="grid grid-cols-3 gap-px bg-slate-200">
                                                {selectedImages.slice(1, 4).map((src, i) => (
                                                    <div key={i} className="relative">
                                                        <img src={src} alt={`Item ${i + 1}`} className="w-full h-24 object-cover" />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                                            <p className="text-white text-[8px] font-bold truncate">{STOCK_IMAGES.find(s => s.src === src)?.label || `Produkt ${i + 2}`}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Link preview bar */}
                                {adFormat === 'single' && (
                                    <div className="px-4 py-2.5 bg-slate-50 border-t border-b border-slate-200">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{(newCampaign.link_url || 'polendach24.de').replace(/https?:\/\//, '')}</p>
                                        <p className="text-[13px] font-bold text-slate-800 leading-tight mt-0.5">{newCampaign.headline || 'Nagłówek reklamy'}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{newCampaign.link_description || 'Opis pod linkiem'}</p>
                                    </div>
                                )}

                                {/* CTA button & engagement */}
                                <div className="px-4 py-2.5 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-slate-400 text-xs">
                                        <span>👍 Gefällt mir</span>
                                        <span>💬 Kommentieren</span>
                                        <span>↗️ Teilen</span>
                                    </div>
                                    {adFormat === 'single' && (
                                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-[11px] font-bold">
                                            {CTA_OPTIONS.find(o => o.value === newCampaign.cta)?.label || 'Mehr erfahren'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Preview info */}
                            <div className="text-center mt-3">
                                <p className="text-[10px] text-slate-400">
                                    📱 Podgląd mobilny • {adFormat === 'carousel' ? 'Przewiń aby zobaczyć karty →' : adFormat === 'collection' ? 'Główne + miniaturki produktów' : 'Tak reklama wyświetli się w feedzie'}
                                </p>
                            </div>

                            {/* Algorithm tips */}
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-3 mt-4 border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-600 uppercase mb-2">🧠 Tajniki algorytmu FB Ads 2026</p>
                                <div className="space-y-1.5 text-[10px] text-slate-500">
                                    <p>🔵 <strong>Hook w 3s</strong> — pierwsza linijka + obraz muszą przyciągnąć uwagę</p>
                                    <p>🟣 <strong>Karuzela &gt; Pojedyncze</strong> — carousel ma 2-3x wyższy CTR (pokaż produkty)</p>
                                    <p>🟢 <strong>Kolaż = katalog</strong> — Collection Ads najlepsze dla e-commerce / produktów</p>
                                    <p>🟡 <strong>Własne zdjęcia z realizacji</strong> — autentyczne &gt; stockowe (30% lepszy ROI)</p>
                                    <p>🔴 <strong>1200×628px</strong> — optymalna rozdzielczość For feed ads</p>
                                    <p>🟠 <strong>Broad targeting 2026</strong> — mniej ograniczeń = AI lepiej optymalizuje</p>
                                    <p>⚪ <strong>Testuj formaty</strong> — A/B test: ten sam tekst, inny format → mierz wyniki</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ FILTER TABS ═══════════ */}
            <div className="flex items-center gap-2">
                {([
                    { value: 'all' as const, label: 'Wszystkie', count: campaigns.filter(c => c.status !== 'DELETED').length },
                    { value: 'ACTIVE' as const, label: '▶️ Aktywne', count: activeCnt },
                    { value: 'PAUSED' as const, label: '⏸️ Wstrzymane', count: pausedCnt },
                ]).map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            filter === f.value
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {f.label} ({f.count})
                    </button>
                ))}
            </div>

            {/* ═══════════ CAMPAIGNS LIST ═══════════ */}
            {loading ? (
                <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Ładuję kampanie z Facebook...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <p className="text-4xl mb-3">🎯</p>
                    <p className="text-slate-500 font-medium">
                        {filter !== 'all' ? `Brak kampanii ze statusem "${filter}"` : 'Brak kampanii'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Kliknij "🤖 AI Szablony" aby utworzyć pierwszą kampanię</p>
                    <button onClick={() => setShowTemplates(true)} className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">
                        🤖 Otwórz szablony AI
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((c: any, i: number) => {
                        const ins = c.insights?.data?.[0] || {};
                        const hasMetrics = ins.impressions || ins.spend;
                        return (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden">
                                {/* Campaign header */}
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                c.status === 'ACTIVE'
                                                    ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                                                    : 'bg-gradient-to-br from-slate-300 to-slate-400'
                                            }`}>
                                                <span className="text-white text-lg">{c.status === 'ACTIVE' ? '▶️' : '⏸️'}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-800 truncate">{c.name}</h4>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                                                        {c.status}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {objectiveLabels[c.objective] || c.objective}
                                                    </span>
                                                    {c.daily_budget && (
                                                        <span className="text-[10px] text-emerald-600 font-medium">
                                                            €{(c.daily_budget / 100).toFixed(2)}/dzień
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 flex-shrink-0 ml-3">
                                            <button onClick={() => loadCampaignDetails(c.id)}
                                                className="px-2 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                                                title="Szczegóły">
                                                {expandedCampaign === c.id ? '▲' : '▼'} Info
                                            </button>
                                            <button onClick={() => handleCloneCampaign(c)}
                                                className="px-2 py-1.5 rounded-lg text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                title="Klonuj kampanię">
                                                📋
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(c.id, c.status)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                    c.status === 'ACTIVE'
                                                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}>
                                                {c.status === 'ACTIVE' ? '⏸️ Stop' : '▶️ Start'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCampaign(c.id, c.name)}
                                                className="px-2 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                                                title="Usuń kampanię">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    {/* Campaign metrics */}
                                    {hasMetrics && (
                                        <div className="grid grid-cols-5 gap-2 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-lg p-3">
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-700">{Number(ins.impressions || 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-slate-400 uppercase">Wyświetlenia</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-blue-600">{Number(ins.reach || 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-slate-400 uppercase">Zasięg</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-purple-600">{Number(ins.clicks || 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-slate-400 uppercase">Kliknięcia</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-teal-600">{Number(ins.ctr || 0).toFixed(2)}%</p>
                                                <p className="text-[9px] text-slate-400 uppercase">CTR</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-orange-600">€{Number(ins.spend || 0).toFixed(2)}</p>
                                                <p className="text-[9px] text-slate-400 uppercase">Wydano</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Alert badges */}
                                {getCampaignAlerts(c).length > 0 && (
                                    <div className="px-5 py-2 flex flex-wrap gap-1.5">
                                        {getCampaignAlerts(c).map((alert, ai) => (
                                            <span key={ai} className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium border border-red-200 animate-pulse">
                                                {alert}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Campaign detail expansion */}
                                {expandedCampaign === c.id && (
                                    <div className="px-5 py-3 bg-blue-50/50 border-t border-blue-100">
                                        {loadingDetails ? (
                                            <div className="flex items-center gap-2 text-xs text-blue-500">
                                                <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                Ładuję szczegóły...
                                            </div>
                                        ) : campaignDetails[c.id] ? (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-blue-700 uppercase">📊 Ad Sets ({campaignDetails[c.id].adSets?.length || 0})</p>
                                                {(campaignDetails[c.id].adSets || []).length === 0
                                                    ? <p className="text-[10px] text-slate-400">Brak grup reklam</p>
                                                    : (campaignDetails[c.id].adSets || []).map((as2: any, j: number) => {
                                                        const asIns = as2.insights?.data?.[0] || {};
                                                        return (
                                                            <div key={j} className="bg-white rounded-lg p-2.5 border border-blue-100">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-700">{as2.name}</p>
                                                                        <p className="text-[10px] text-slate-400">
                                                                            Status: <span className={as2.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}>{as2.status}</span>
                                                                            {as2.daily_budget && ` • €${(as2.daily_budget / 100).toFixed(2)}/d`}
                                                                            {as2.optimization_goal && ` • ${as2.optimization_goal}`}
                                                                        </p>
                                                                    </div>
                                                                    {asIns.spend && (
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] font-bold text-orange-600">€{Number(asIns.spend).toFixed(2)}</p>
                                                                            <p className="text-[9px] text-slate-400">{Number(asIns.clicks || 0)} klik</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Targeting info */}
                                                                {as2.targeting && (
                                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                                        {as2.targeting.geo_locations?.countries?.map((co: string) => (
                                                                            <span key={co} className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">🌍 {co}</span>
                                                                        ))}
                                                                        {as2.targeting.age_min && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">👤 {as2.targeting.age_min}-{as2.targeting.age_max}</span>}
                                                                        {as2.targeting.publisher_platforms?.map((pl: string) => (
                                                                            <span key={pl} className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">📱 {pl}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                <p className="text-[10px] font-bold text-indigo-700 uppercase mt-2">🎨 Reklamy ({campaignDetails[c.id].ads?.length || 0})</p>
                                                {(campaignDetails[c.id].ads || []).length === 0
                                                    ? <p className="text-[10px] text-slate-400">Brak reklam</p>
                                                    : (campaignDetails[c.id].ads || []).slice(0, 5).map((ad: any, k: number) => {
                                                        const adIns = ad.insights?.data?.[0] || {};
                                                        return (
                                                            <div key={k} className="bg-white rounded-lg p-2 border border-indigo-100 flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-[11px] font-medium text-slate-700">{ad.name}</p>
                                                                    <p className="text-[9px] text-slate-400">{ad.status} {adIns.impressions ? `• ${Number(adIns.impressions).toLocaleString()} wyświetleń` : ''}</p>
                                                                </div>
                                                                {adIns.spend && (
                                                                    <div className="text-right">
                                                                        <p className="text-[10px] font-bold text-orange-600">€{Number(adIns.spend).toFixed(2)}</p>
                                                                        <p className="text-[9px] text-slate-400">CTR {Number(adIns.ctr || 0).toFixed(2)}%</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {/* Campaign footer */}
                                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                    <span>
                                        Budżet: {c.daily_budget ? `€${(c.daily_budget / 100).toFixed(2)}/dzień` : c.lifetime_budget ? `€${(c.lifetime_budget / 100).toFixed(2)} łącznie` : 'nieokreślony'}
                                        {c.start_time && ` • Start: ${new Date(c.start_time).toLocaleDateString('pl-PL')}`}
                                    </span>
                                    <span className="text-slate-300">ID: {c.id}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══════════ STRATEGY GUIDE ═══════════ */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-xs">🧠</span>
                    Strategia kampanii — Polendach24 DE
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-xs font-bold text-green-400 mb-1">🟢 Funnel: TOFU (Góra)</p>
                        <p className="text-[11px] text-slate-300">
                            <strong>Cel:</strong> Awareness + Traffic<br/>
                            <strong>Budżet:</strong> €10-20/dzień<br/>
                            <strong>Format:</strong> Video timelapse, karuzela zdjęć<br/>
                            <strong>Audience:</strong> Broad, 30-65, DE, Haus & Garten
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-xs font-bold text-yellow-400 mb-1">🟡 Funnel: MOFU (Środek)</p>
                        <p className="text-[11px] text-slate-300">
                            <strong>Cel:</strong> Leads + Engagement<br/>
                            <strong>Budżet:</strong> €15-30/dzień<br/>
                            <strong>Format:</strong> Lead Forms, opinie klientów<br/>
                            <strong>Audience:</strong> Webseitenbesucher, Engaged Users
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-xs font-bold text-red-400 mb-1">🔴 Funnel: BOFU (Dół)</p>
                        <p className="text-[11px] text-slate-300">
                            <strong>Cel:</strong> Conversions + Sales<br/>
                            <strong>Budżet:</strong> €20-50/dzień<br/>
                            <strong>Format:</strong> Rabaty, oferty limitowane<br/>
                            <strong>Audience:</strong> Retargeting 7-30 dni, Lookalike 1%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
