import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CampaignService } from '../services/database/campaign.service';
import type { Campaign } from '../services/database/campaign.service';
import { getCampaignTemplates } from '../components/campaigns/CampaignTemplates';
import type { CampaignTemplateParams } from '../components/campaigns/CampaignTemplates';
import { wrapInBrandTemplate, textToEmailHtml } from '../utils/emailBrandKit';
import { toast } from 'react-hot-toast';

type LeadStatus = string;

const KANBAN_STAGES: { id: LeadStatus; label: string; emoji: string }[] = [
    { id: 'new', label: 'Nowe', emoji: '🆕' },
    { id: 'formularz', label: 'Formularz', emoji: '📋' },
    { id: 'contacted', label: 'Skontaktowano', emoji: '📞' },
    { id: 'offer_sent', label: 'Wysłano Ofertę', emoji: '📄' },
    { id: 'measurement_scheduled', label: 'Umówiony pomiar', emoji: '📐' },
    { id: 'measurement_completed', label: 'Pomiar odbył się', emoji: '✅' },
    { id: 'negotiation', label: 'Negocjacje', emoji: '🤝' },
    { id: 'won', label: 'Wygrane', emoji: '🏆' },
    { id: 'lost', label: 'Utracone', emoji: '❌' },
    { id: 'fair', label: 'Targi', emoji: '🎪' },
];

// Segment definitions for campaign targeting
type SegmentId = 'all' | 'customers' | 'customers_with_offers' | 'customers_with_contracts' | 'all_leads' | 'leads_by_status' | 'geo_radius';
const SEGMENTS: { id: SegmentId; label: string; emoji: string; desc: string }[] = [
    { id: 'geo_radius', label: 'W pobliżu realizacji', emoji: '📍', desc: 'Wg kodu PLZ + promień' },
    { id: 'all', label: 'Wszyscy kontakty', emoji: '📧', desc: 'Klienci + Leady' },
    { id: 'customers', label: 'Wszyscy klienci', emoji: '👤', desc: 'Z tabeli klientów' },
    { id: 'customers_with_offers', label: 'Klienci z ofertą', emoji: '📄', desc: 'Mają min. 1 ofertę' },
    { id: 'customers_with_contracts', label: 'Klienci z umową', emoji: '📑', desc: 'Mają podpisaną umowę' },
    { id: 'all_leads', label: 'Wszystkie leady', emoji: '📋', desc: 'Z pipeline\'u sprzedaży' },
    { id: 'leads_by_status', label: 'Leady wg etapu', emoji: '🎯', desc: 'Filtruj po statusie' },
];

interface EligibleRecipient {
    email: string;
    name: string;
    customerId?: string;
    leadId?: string;
    status: string;
    source: 'customer' | 'lead';
    selected: boolean;
    distance?: number;
    plz?: string;
    city?: string;
}

const EmailCampaignsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [step, setStep] = useState<'list' | 'create' | 'sending'>('list');
    
    // Campaign list
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create flow
    const [selectedSegment, setSelectedSegment] = useState<SegmentId>('geo_radius');
    const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
    const [recipients, setRecipients] = useState<EligibleRecipient[]>([]);
    const [recipientsLoading, setRecipientsLoading] = useState(false);
    
    // Geo search
    const [geoPlz, setGeoPlz] = useState('');
    const [geoRadius, setGeoRadius] = useState(60);
    const [geoSearchDone, setGeoSearchDone] = useState(false);
    
    // Template
    const [selectedTemplate, setSelectedTemplate] = useState('letzte_referenz');
    const [subject, setSubject] = useState('');
    const [templateParams, setTemplateParams] = useState<CampaignTemplateParams>({
        projectTitle: 'Exklusive Terrassenüberdachung',
        projectLocation: '',
        projectModel: 'Trendstyle',
        projectDimensions: '6000 × 4000 mm',
        projectColor: 'RAL 7016 Anthrazitgrau',
        projectDescription: 'Ein wunderschönes Projekt für unseren zufriedenen Kunden. Premium-Aluminium, fachgerechte Montage und ein Design, das begeistert.',
        heroImage: '',
        galleryImages: [],
        customHtml: '',
    });
    
    // Image upload
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const heroInputRef = useRef<HTMLInputElement>(null);
    
    // Preview
    const [showPreview, setShowPreview] = useState(false);
    
    // Unsubscribe list
    const [showUnsubscribed, setShowUnsubscribed] = useState(false);
    const [unsubscribedList, setUnsubscribedList] = useState<any[]>([]);
    
    // Sending progress
    const [sendingProgress, setSendingProgress] = useState({ sent: 0, total: 0, failed: 0 });
    
    // Dashboard stats
    const [stats, setStats] = useState<{
        totalCampaigns: number; totalSent: number; totalOpened: number;
        totalFailed: number; totalUnsubscribed: number; openRate: number;
    } | null>(null);
    
    // Load campaigns
    useEffect(() => {
        loadCampaigns();
        loadStats();
    }, []);
    
    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await CampaignService.getCampaigns();
            setCampaigns(data);
        } catch (err) {
            console.error('Error loading campaigns:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const loadStats = async () => {
        try {
            const s = await CampaignService.getCampaignStats();
            setStats(s);
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };
    
    // Load recipients — auto-load on create step entry (not for geo_radius)
    useEffect(() => {
        if (step === 'create' && selectedSegment !== 'geo_radius') {
            loadRecipients();
        }
        if (step === 'create' && selectedSegment === 'geo_radius') {
            setRecipients([]);
            setGeoSearchDone(false);
        }
    }, [step, selectedSegment]);

    // Re-filter when stages change (for leads_by_status segment)
    useEffect(() => {
        if (step === 'create' && selectedSegment === 'leads_by_status' && selectedStages.size > 0) {
            loadRecipients();
        }
    }, [selectedStages]);
    
    const loadRecipients = async () => {
        setRecipientsLoading(true);
        try {
            const filter = selectedSegment === 'leads_by_status' && selectedStages.size > 0
                ? Array.from(selectedStages)
                : undefined;
            const eligible = await CampaignService.getEligibleRecipients(selectedSegment, filter);
            setRecipients(eligible.map(r => ({ ...r, selected: true })));
        } catch (err) {
            console.error('Error loading recipients:', err);
            toast.error('Błąd ładowania odbiorców');
        } finally {
            setRecipientsLoading(false);
        }
    };

    const loadGeoRecipients = async () => {
        if (!geoPlz || geoPlz.length < 4) {
            toast.error('Wpisz poprawny kod PLZ (min. 4 cyfry)');
            return;
        }
        setRecipientsLoading(true);
        setGeoSearchDone(false);
        try {
            const results = await CampaignService.getGeoRecipients(geoPlz, geoRadius);
            setRecipients(results.map(r => ({ ...r, selected: true })));
            setGeoSearchDone(true);
            if (results.length === 0) {
                toast('Brak kontaktów w promieniu ' + geoRadius + ' km', { icon: '📍' });
            } else {
                toast.success(`Znaleziono ${results.length} kontaktów w promieniu ${geoRadius} km`);
            }
        } catch (err: any) {
            console.error('Geo search error:', err);
            toast.error(err.message || 'Błąd wyszukiwania geo');
        } finally {
            setRecipientsLoading(false);
        }
    };
    
    const loadUnsubscribed = async () => {
        try {
            const data = await CampaignService.getUnsubscribed();
            setUnsubscribedList(data);
        } catch (err) {
            console.error('Error loading unsubscribed:', err);
        }
    };
    
    const selectedRecipients = useMemo(() => 
        recipients.filter(r => r.selected), 
        [recipients]
    );
    
    const toggleStage = (stageId: string) => {
        setSelectedStages(prev => {
            const next = new Set(prev);
            if (next.has(stageId)) next.delete(stageId);
            else next.add(stageId);
            return next;
        });
    };
    
    const selectAllStages = () => {
        if (selectedStages.size === KANBAN_STAGES.length) {
            setSelectedStages(new Set());
        } else {
            setSelectedStages(new Set(KANBAN_STAGES.map(s => s.id)));
        }
    };
    
    const toggleRecipient = (email: string) => {
        setRecipients(prev => prev.map(r => 
            r.email === email ? { ...r, selected: !r.selected } : r
        ));
    };
    
    const selectAllRecipients = () => {
        const allSelected = recipients.every(r => r.selected);
        setRecipients(prev => prev.map(r => ({ ...r, selected: !allSelected })));
    };
    
    // Image upload handlers
    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await CampaignService.uploadCampaignImage(file);
            setTemplateParams(prev => ({ ...prev, heroImage: url }));
            toast.success('Hero-Bild hochgeladen');
        } catch (err: any) {
            console.error('Hero upload error:', err);
            toast.error(err?.message || 'Fehler beim Hochladen');
        } finally {
            setUploading(false);
        }
    };
    
    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const urls: string[] = [];
            for (const file of Array.from(files)) {
                const url = await CampaignService.uploadCampaignImage(file);
                urls.push(url);
            }
            setTemplateParams(prev => ({
                ...prev,
                galleryImages: [...(prev.galleryImages || []), ...urls]
            }));
            toast.success(`${urls.length} Bild(er) hochgeladen`);
        } catch (err: any) {
            console.error('Gallery upload error:', err);
            toast.error(err?.message || 'Fehler beim Hochladen');
        } finally {
            setUploading(false);
        }
    };
    
    const removeGalleryImage = (index: number) => {
        setTemplateParams(prev => ({
            ...prev,
            galleryImages: (prev.galleryImages || []).filter((_, i) => i !== index)
        }));
    };
    
    // Generate preview HTML
    const generatePreview = (): string => {
        const templates = getCampaignTemplates();
        const tpl = templates.find(t => t.id === selectedTemplate);
        if (!tpl) return '';
        return tpl.previewHtml(templateParams);
    };
    
    // Generate final email body
    const generateBody = (): string => {
        const templates = getCampaignTemplates();
        const tpl = templates.find(t => t.id === selectedTemplate);
        if (!tpl) return '';
        const body = tpl.generateBody(templateParams);
        return wrapInBrandTemplate(body, { showProducts: true, showUSPs: true });
    };
    
    // Send campaign
    const handleSend = async () => {
        if (selectedRecipients.length === 0) {
            toast.error('Brak odbiorców');
            return;
        }
        if (!subject.trim()) {
            toast.error('Wpisz temat wiadomości');
            return;
        }
        
        const confirmed = window.confirm(
            `Czy na pewno chcesz wysłać kampanię do ${selectedRecipients.length} odbiorców?\n\nTemat: ${subject}\n\nWysyłanie zajmie ok. ${Math.ceil(selectedRecipients.length * 3 / 60)} minut.`
        );
        if (!confirmed) return;
        
        setStep('sending');
        setSendingProgress({ sent: 0, total: selectedRecipients.length, failed: 0 });
        
        try {
            // Create campaign
            const htmlBody = generateBody();
            const campaign = await CampaignService.createCampaign({
                name: `Kampania: ${subject}`,
                subject,
                htmlBody,
                templateId: selectedTemplate,
                images: [
                    ...(templateParams.heroImage ? [templateParams.heroImage] : []),
                    ...(templateParams.galleryImages || []),
                ],
                createdBy: currentUser?.id,
            });
            
            // Add recipients
            await CampaignService.addRecipients(
                campaign.id,
                selectedRecipients.map(r => ({
                    email: r.email,
                    name: r.name,
                    customerId: r.customerId,
                    leadId: r.leadId,
                }))
            );
            
            // Update total
            await CampaignService.updateCampaign(campaign.id, {
                totalRecipients: selectedRecipients.length,
                status: 'sending',
            });
            
            // Send via edge function
            await CampaignService.sendCampaign(campaign.id);
            
            toast.success(`Kampania wysłana do ${selectedRecipients.length} odbiorców!`);
            setSendingProgress(prev => ({ ...prev, sent: selectedRecipients.length }));
            
            // Reload
            await loadCampaigns();
            
            setTimeout(() => {
                setStep('list');
            }, 3000);
            
        } catch (err: any) {
            console.error('Error sending campaign:', err);
            toast.error(`Błąd: ${err.message || 'Nie udało się wysłać kampanii'}`);
            setStep('create');
        }
    };
    
    // ── RENDER ─────────────────────────────────────────────

    // Sending progress view
    if (step === 'sending') {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
                    <div className="text-6xl mb-6">📨</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Wysyłanie kampanii...</h2>
                    <p className="text-slate-500 mb-6">
                        Maile są wysyłane kolejno z 3-sekundowym odstępem,<br/>
                        aby zapewnić bezpieczeństwo dostarczalności.
                    </p>
                    <div className="bg-slate-100 rounded-full h-4 mb-4 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${sendingProgress.total > 0 ? (sendingProgress.sent / sendingProgress.total) * 100 : 0}%` }}
                        />
                    </div>
                    <p className="text-sm text-slate-600">
                        <span className="font-bold text-blue-600">{sendingProgress.sent}</span> / {sendingProgress.total} wysłano
                        {sendingProgress.failed > 0 && (
                            <span className="text-red-500 ml-2">({sendingProgress.failed} nieudane)</span>
                        )}
                    </p>
                    <p className="text-xs text-slate-400 mt-4">
                        Szacowany czas: ~{Math.ceil(sendingProgress.total * 3 / 60)} min
                    </p>
                </div>
            </div>
        );
    }
    
    // List view
    if (step === 'list') {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
                                📧 Kampanie Mailowe
                            </h1>
                            <p className="text-slate-500 mt-1">Wysyłaj profesjonalne maile do wybranych grup klientów</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowUnsubscribed(true); loadUnsubscribed(); }}
                                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                                🚫 Wypisani ({unsubscribedList.length})
                            </button>
                            <button
                                onClick={() => setStep('create')}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                            >
                                ✨ Nowa Kampania
                            </button>
                        </div>
                    </div>
                    
                    {/* Dashboard Stats */}
                    {stats && stats.totalCampaigns > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-bold text-slate-800">{stats.totalCampaigns}</div>
                                <div className="text-xs text-slate-500 mt-1">📧 Kampanie</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.totalSent}</div>
                                <div className="text-xs text-slate-500 mt-1">📨 Wysłano</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-bold text-emerald-600">{stats.totalOpened}</div>
                                <div className="text-xs text-slate-500 mt-1">👁️ Otwarto</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-bold" style={{ color: stats.openRate >= 30 ? '#16a34a' : stats.openRate >= 15 ? '#ca8a04' : '#dc2626' }}>
                                    {stats.openRate}%
                                </div>
                                <div className="text-xs text-slate-500 mt-1">📊 Open Rate</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                                <div className="text-2xl font-bold text-red-500">{stats.totalUnsubscribed}</div>
                                <div className="text-xs text-slate-500 mt-1">🚫 Wypisani</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Campaign history */}
                    {loading ? (
                        <div className="text-center py-20 text-slate-400">Ładowanie...</div>
                    ) : campaigns.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                            <div className="text-6xl mb-4">📬</div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Brak kampanii</h3>
                            <p className="text-slate-500 mb-6">Stwórz swoją pierwszą kampanię mailową</p>
                            <button
                                onClick={() => setStep('create')}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                Utwórz kampanię
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.map(camp => (
                                <div key={camp.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{camp.name}</h3>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                Temat: {camp.subject}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {camp.createdAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            {/* Open rate */}
                                            {camp.status === 'sent' && camp.sentCount > 0 && (
                                                <div className="text-center">
                                                    <div className="text-lg font-bold" style={{
                                                        color: camp.sentCount > 0 && (camp.openedCount / camp.sentCount) >= 0.3 ? '#16a34a' :
                                                               (camp.openedCount / camp.sentCount) >= 0.15 ? '#ca8a04' : '#dc2626'
                                                    }}>
                                                        {Math.round((camp.openedCount / camp.sentCount) * 100)}%
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">open rate</div>
                                                </div>
                                            )}
                                            {/* Counts */}
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-700">
                                                    {camp.sentCount} / {camp.totalRecipients}
                                                </div>
                                                <div className="text-xs text-slate-400">wysłano</div>
                                                {camp.openedCount > 0 && (
                                                    <div className="text-xs text-emerald-600">👁️ {camp.openedCount} otwarto</div>
                                                )}
                                                {camp.failedCount > 0 && (
                                                    <div className="text-xs text-red-500">{camp.failedCount} błędów</div>
                                                )}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                camp.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                                                camp.status === 'sending' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                                camp.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                                camp.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {camp.status === 'sent' ? '✅ Wysłano' :
                                                 camp.status === 'sending' ? '📨 Wysyłanie...' :
                                                 camp.status === 'draft' ? '📝 Szkic' :
                                                 camp.status === 'failed' ? '❌ Błąd' :
                                                 camp.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Unsubscribed modal */}
                    {showUnsubscribed && (
                        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUnsubscribed(false)}>
                            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[600px] overflow-auto p-6" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">🚫 Wypisani z mailingu</h3>
                                {unsubscribedList.length === 0 ? (
                                    <p className="text-slate-500 text-center py-8">Nikt się jeszcze nie wypisał</p>
                                ) : (
                                    <div className="space-y-2">
                                        {unsubscribedList.map((u: any) => (
                                            <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-700">{u.email}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {u.unsubscribedAt.toLocaleDateString('de-DE')} • {u.source}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        await CampaignService.removeUnsubscribe(u.email);
                                                        loadUnsubscribed();
                                                        toast.success('Przywrócono do mailingu');
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    Przywróć
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowUnsubscribed(false)}
                                    className="w-full mt-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                                >
                                    Zamknij
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // ── CREATE CAMPAIGN FLOW ──────────────────────────────
    
    const templates = getCampaignTemplates();
    const currentTemplate = templates.find(t => t.id === selectedTemplate);
    
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setStep('list')}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">✨ Nowa Kampania</h1>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column — Settings */}
                    <div className="lg:col-span-2 space-y-6">
                    
                        {/* 1. Select segment */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                Wybierz grupę odbiorców
                            </h2>
                            
                            {/* Segment buttons */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                {SEGMENTS.map(seg => (
                                    <button
                                        key={seg.id}
                                        onClick={() => { setSelectedSegment(seg.id); setSelectedStages(new Set()); }}
                                        className={`p-3 rounded-xl text-left border-2 transition-all ${
                                            selectedSegment === seg.id
                                                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="text-lg mb-0.5">{seg.emoji}</div>
                                        <div className={`text-xs font-bold ${selectedSegment === seg.id ? 'text-blue-700' : 'text-slate-700'}`}>{seg.label}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{seg.desc}</div>
                                    </button>
                                ))}
                            </div>
                            
                            {/* Show kanban stage filter when leads_by_status selected */}
                            {selectedSegment === 'leads_by_status' && (
                                <div className="border-t border-slate-100 pt-3 mb-4">
                                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Filtruj po etapie:</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            onClick={selectAllStages}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                                selectedStages.size === KANBAN_STAGES.length 
                                                    ? 'bg-blue-600 text-white border-blue-600' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                            }`}
                                        >
                                            Wszystkie
                                        </button>
                                        {KANBAN_STAGES.map(stage => (
                                            <button
                                                key={stage.id}
                                                onClick={() => toggleStage(stage.id)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                                    selectedStages.has(stage.id) 
                                                        ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'
                                                }`}
                                            >
                                                {stage.emoji} {stage.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Show PLZ radius search when geo_radius selected */}
                            {selectedSegment === 'geo_radius' && (
                                <div className="border-t border-slate-100 pt-4 mb-4">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                                        <div className="text-xs font-bold text-blue-700 mb-3 uppercase flex items-center gap-1.5">
                                            📍 PLZ der Realisierung eingeben
                                        </div>
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={geoPlz}
                                                onChange={(e) => setGeoPlz(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                                                placeholder="z.B. 14467"
                                                className="flex-1 px-3 py-2.5 border-2 border-blue-200 rounded-lg text-lg font-bold text-center tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                maxLength={5}
                                            />
                                        </div>
                                        <div className="text-xs font-bold text-slate-500 mb-2">Promień (km):</div>
                                        <div className="flex gap-1.5 mb-3">
                                            {[30, 60, 100, 150].map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setGeoRadius(r)}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                                                        geoRadius === r
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                                    }`}
                                                >
                                                    {r} km
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={loadGeoRecipients}
                                            disabled={recipientsLoading || geoPlz.length < 4}
                                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                        >
                                            {recipientsLoading ? (
                                                <>
                                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Szukam... (geokodowanie PLZ)
                                                </>
                                            ) : (
                                                <>🔍 Szukaj kontaktów w promieniu {geoRadius} km</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Recipients list */}
                            {recipientsLoading && selectedSegment !== 'geo_radius' ? (
                                <div className="text-center py-6 text-slate-400">Szukam odbiorców...</div>
                            ) : recipients.length > 0 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-slate-600">
                                            <span className="text-lg font-bold text-blue-600">{selectedRecipients.length}</span> / {recipients.length} wybranych
                                        </span>
                                        <button 
                                            onClick={selectAllRecipients}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            {recipients.every(r => r.selected) ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                                        </button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
                                        {recipients.map(r => (
                                            <label 
                                                key={r.email}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                                    r.selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={r.selected}
                                                    onChange={() => toggleRecipient(r.email)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-700 truncate">{r.name || r.email}</div>
                                                    <div className="text-xs text-slate-400 truncate">
                                                        {r.email}
                                                        {r.plz && ` · ${r.plz}`}
                                                        {r.city && ` ${r.city}`}
                                                    </div>
                                                </div>
                                                {r.distance !== undefined && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                                        r.distance <= 30 ? 'bg-green-50 text-green-700' :
                                                        r.distance <= 60 ? 'bg-emerald-50 text-emerald-600' :
                                                        r.distance <= 100 ? 'bg-yellow-50 text-yellow-700' :
                                                        'bg-orange-50 text-orange-600'
                                                    }`}>
                                                        📍 {r.distance} km
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                                    r.source === 'customer'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                    {r.source === 'customer' ? '👤 Klient' : '📋 Lead'}
                                                    {r.status !== 'customer' ? ` · ${r.status}` : ''}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center py-6 text-slate-400">Brak odbiorców z emailem w wybranej grupie</p>
                            )}
                        </div>
                        
                        {/* 2. Choose template */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                Wybierz szablon
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                {templates.map(tpl => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => {
                                            setSelectedTemplate(tpl.id);
                                            if (tpl.subject) setSubject(tpl.subject);
                                        }}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            selectedTemplate === tpl.id 
                                                ? 'border-blue-500 bg-blue-50 shadow-md' 
                                                : 'border-slate-200 hover:border-blue-200 bg-white'
                                        }`}
                                    >
                                        <div className="font-bold text-slate-800 text-sm">{tpl.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{tpl.description}</div>
                                    </button>
                                ))}
                            </div>
                            
                            {/* Subject */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Temat wiadomości</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="np. Unsere neueste Referenz – Exklusive Terrassenüberdachung"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        {/* 3. Template content */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                Treść i zdjęcia
                            </h2>
                            
                            {selectedTemplate === 'letzte_referenz' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Tytuł projektu</label>
                                            <input type="text" value={templateParams.projectTitle || ''} onChange={e => setTemplateParams(p => ({ ...p, projectTitle: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Exklusive Terrassenüberdachung" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Lokalizacja</label>
                                            <input type="text" value={templateParams.projectLocation || ''} onChange={e => setTemplateParams(p => ({ ...p, projectLocation: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Brandenburg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Model</label>
                                            <input type="text" value={templateParams.projectModel || ''} onChange={e => setTemplateParams(p => ({ ...p, projectModel: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Trendstyle" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Wymiary</label>
                                            <input type="text" value={templateParams.projectDimensions || ''} onChange={e => setTemplateParams(p => ({ ...p, projectDimensions: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="6000 × 4000 mm" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Kolor</label>
                                            <input type="text" value={templateParams.projectColor || ''} onChange={e => setTemplateParams(p => ({ ...p, projectColor: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="RAL 7016 Anthrazitgrau" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Opis</label>
                                        <textarea value={templateParams.projectDescription || ''} onChange={e => setTemplateParams(p => ({ ...p, projectDescription: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" placeholder="Ein wunderschönes Projekt..." />
                                    </div>
                                </div>
                            ) : selectedTemplate === 'sonderaktion' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Tytuł promocji</label>
                                            <input type="text" value={templateParams.promoTitle || ''} onChange={e => setTemplateParams(p => ({ ...p, promoTitle: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Frühlings-Sonderaktion" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Podtytuł</label>
                                            <input type="text" value={templateParams.promoSubtitle || ''} onChange={e => setTemplateParams(p => ({ ...p, promoSubtitle: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Nur für kurze Zeit" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">🏷️ Rabat</label>
                                            <input type="text" value={templateParams.promoDiscount || ''} onChange={e => setTemplateParams(p => ({ ...p, promoDiscount: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="15% Rabatt" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">⏰ Ważne do</label>
                                            <input type="text" value={templateParams.promoDeadline || ''} onChange={e => setTemplateParams(p => ({ ...p, promoDeadline: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="31.03.2026" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Produkty objęte promocją</label>
                                            <input type="text" value={templateParams.promoProducts || ''} onChange={e => setTemplateParams(p => ({ ...p, promoProducts: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Terrassenüberdachungen, Carports, Pergolen" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Opis promocji</label>
                                        <textarea value={templateParams.promoDescription || ''} onChange={e => setTemplateParams(p => ({ ...p, promoDescription: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" placeholder="Sichern Sie sich jetzt Ihre Premium-Terrassenüberdachung zum Sonderpreis..." />
                                    </div>
                                </div>
                            ) : selectedTemplate === 'kundenbewertung' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Imię klienta (domyślne)</label>
                                            <input type="text" value={templateParams.customerName || ''} onChange={e => setTemplateParams(p => ({ ...p, customerName: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Sehr geehrter Kunde" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">📅 Data montażu</label>
                                            <input type="text" value={templateParams.installationDate || ''} onChange={e => setTemplateParams(p => ({ ...p, installationDate: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="15.03.2026" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-1">⭐ Link Google Reviews</label>
                                            <input type="url" value={templateParams.googleReviewUrl || ''} onChange={e => setTemplateParams(p => ({ ...p, googleReviewUrl: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="https://g.page/r/polendach24/review" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Treść wiadomości</label>
                                        <textarea value={templateParams.reviewMessage || ''} onChange={e => setTemplateParams(p => ({ ...p, reviewMessage: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" placeholder="Wir hoffen, dass Sie Ihre neue Terrassenüberdachung in vollen Zügen genießen..." />
                                    </div>
                                </div>
                            ) : selectedTemplate === 'neuigkeiten' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Wstęp newslettera</label>
                                        <textarea value={templateParams.newsletterIntro || ''} onChange={e => setTemplateParams(p => ({ ...p, newsletterIntro: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none" placeholder="Liebe Kunden und Interessenten..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Treść (HTML / Tekst)</label>
                                        <textarea value={templateParams.customHtml || ''} onChange={e => setTemplateParams(p => ({ ...p, customHtml: e.target.value }))} rows={8} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono resize-none" placeholder="<h2>Nasz najnowszy projekt</h2><p>Treść...</p>" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Treść HTML / Tekst</label>
                                    <textarea value={templateParams.customHtml || ''} onChange={e => setTemplateParams(p => ({ ...p, customHtml: e.target.value }))} rows={8} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono resize-none" placeholder="<h2>Twój nagłówek</h2><p>Treść maila...</p>" />
                                </div>
                            )}
                            
                            {/* Hero Image Upload */}
                            <div className="mt-6">
                                <label className="block text-xs font-bold text-slate-600 mb-2">🖼️ Zdjęcie główne (Hero)</label>
                                {templateParams.heroImage ? (
                                    <div className="relative inline-block">
                                        <img 
                                            src={templateParams.heroImage} 
                                            alt="Hero" 
                                            className="w-full max-w-md h-48 object-cover rounded-xl border border-slate-200 shadow-sm"
                                        />
                                        <button
                                            onClick={() => setTemplateParams(p => ({ ...p, heroImage: '' }))}
                                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => heroInputRef.current?.click()}
                                        disabled={uploading}
                                        className="px-4 py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors w-full text-sm"
                                    >
                                        {uploading ? '⏳ Przesyłanie...' : '📷 Kliknij aby dodać zdjęcie główne'}
                                    </button>
                                )}
                                <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                            </div>
                            
                            {/* Gallery Upload */}
                            <div className="mt-6">
                                <label className="block text-xs font-bold text-slate-600 mb-2">📸 Galeria zdjęć (opcjonalne)</label>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {(templateParams.galleryImages || []).map((url, i) => (
                                        <div key={i} className="relative">
                                            <img src={url} alt={`Gallery ${i + 1}`} className="w-28 h-28 object-cover rounded-lg border border-slate-200 shadow-sm" />
                                            <button
                                                onClick={() => removeGalleryImage(i)}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-28 h-28 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-2xl"
                                    >
                                        {uploading ? '⏳' : '+'}
                                    </button>
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                                <p className="text-xs text-slate-400">Zdjęcia zostaną automatycznie dopasowane do szerokości szablonu (max 600px)</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right column — Preview + Actions */}
                    <div className="space-y-4">
                        {/* Quick stats */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <h3 className="text-sm font-bold text-slate-600 mb-3">📊 Podsumowanie</h3>
                            <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Odbiorcy:</span>
                                    <span className="font-bold text-slate-800">{selectedRecipients.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Etapy:</span>
                                    <span className="font-bold text-slate-800">{selectedStages.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Szablon:</span>
                                    <span className="font-bold text-slate-800">{currentTemplate?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Zdjęcia:</span>
                                    <span className="font-bold text-slate-800">
                                        {(templateParams.heroImage ? 1 : 0) + (templateParams.galleryImages?.length || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Czas wysyłki:</span>
                                    <span className="font-bold text-slate-800">~{Math.ceil(selectedRecipients.length * 3 / 60)} min</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Preview button */}
                        <button
                            onClick={() => setShowPreview(true)}
                            className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                            👁️ Podgląd maila
                        </button>
                        
                        {/* Send button */}
                        <button
                            onClick={handleSend}
                            disabled={selectedRecipients.length === 0 || !subject.trim()}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            📨 Wyślij kampanię ({selectedRecipients.length} odbiorców)
                        </button>
                        
                        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                            Maile będą wysyłane z 3s odstępem.<br/>
                            Każdy mail zawiera link do wypisania się.<br/>
                            Wypisani klienci nie dostaną kolejnych kampanii.
                        </p>
                    </div>
                </div>
                
                {/* Preview modal */}
                {showPreview && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
                        <div className="bg-white rounded-2xl shadow-xl max-w-[700px] w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center z-10">
                                <h3 className="font-bold text-slate-800">Podgląd wiadomości</h3>
                                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                            </div>
                            <div className="p-4">
                                <div className="bg-slate-100 rounded-xl p-3 mb-3">
                                    <p className="text-xs text-slate-500"><strong>Temat:</strong> {subject || '(brak tematu)'}</p>
                                    <p className="text-xs text-slate-500"><strong>Od:</strong> buero@polendach24.de</p>
                                    <p className="text-xs text-slate-500"><strong>Do:</strong> {selectedRecipients.length} odbiorców</p>
                                </div>
                                <iframe
                                    srcDoc={generatePreview()}
                                    className="w-full border border-slate-200 rounded-xl"
                                    style={{ minHeight: '600px' }}
                                    title="Email Preview"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailCampaignsPage;
