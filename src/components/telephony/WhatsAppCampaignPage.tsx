import React, { useEffect, useState, useRef } from 'react';
import { TelephonyService } from '../../services/database/telephony.service';
import toast from 'react-hot-toast';

const WA_GREEN = '#25D366';
const WA_DARK = '#111B21';

const PIPELINE_STAGES: Record<string, { label: string; color: string; emoji: string }> = {
    new: { label: 'Nowy', color: '#3B82F6', emoji: '🔵' },
    contacted: { label: 'Kontakt', color: '#F59E0B', emoji: '🟡' },
    fair: { label: 'Targi', color: '#8B5CF6', emoji: '🟣' },
    formularz: { label: 'Formularz', color: '#06B6D4', emoji: '🔷' },
    offer_sent: { label: 'Oferta', color: '#F97316', emoji: '✉️' },
    negotiation: { label: 'Negocjacje', color: '#EF4444', emoji: '🟠' },
    measurement_scheduled: { label: 'Pomiar plan.', color: '#14B8A6', emoji: '📐' },
    measurement_completed: { label: 'Pomiar wyk.', color: '#10B981', emoji: '✅' },
    won: { label: 'Wygrany', color: '#22C55E', emoji: '🏆' },
    lost: { label: 'Przegrany', color: '#6B7280', emoji: '❌' },
};

const TEMPLATE_CATEGORIES: Record<string, { label: string; emoji: string }> = {
    promotion: { label: 'Promocja', emoji: '🏷️' },
    follow_up: { label: 'Follow-up', emoji: '🔄' },
    realization: { label: 'Realizacja', emoji: '🏗️' },
    seasonal: { label: 'Sezonowa', emoji: '🌞' },
    reminder: { label: 'Przypomnienie', emoji: '⏰' },
};

type Contact = { id: string; firstName: string; lastName: string; phone: string; email: string; city: string; status: string; source: string; companyName: string };

export const WhatsAppCampaignPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'contacts' | 'templates' | 'campaign' | 'history'>('contacts');

    // ── CONTACTS STATE ──
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [contactSearch, setContactSearch] = useState('');

    // ── TEMPLATES STATE ──
    const [templates, setTemplates] = useState<any[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [tplName, setTplName] = useState('');
    const [tplCategory, setTplCategory] = useState('promotion');
    const [tplBody, setTplBody] = useState('');
    const [tplMediaUrls, setTplMediaUrls] = useState<string[]>([]);
    const [tplUploading, setTplUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── CAMPAIGN STATE ──
    const [campaignStep, setCampaignStep] = useState(1);
    const [campaignName, setCampaignName] = useState('');
    const [campaignTemplate, setCampaignTemplate] = useState<any>(null);
    const [campaignContacts, setCampaignContacts] = useState<Contact[]>([]);
    const [campaignSending, setCampaignSending] = useState(false);

    // ── HISTORY STATE ──
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);
    const [viewingCampaign, setViewingCampaign] = useState<any>(null);
    const [campaignRecipients, setCampaignRecipients] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'contacts') loadContacts();
        if (activeTab === 'templates') loadTemplates();
        if (activeTab === 'history') loadCampaigns();
        if (activeTab === 'campaign') { loadTemplates(); loadContacts(); }
    }, [activeTab]);

    // ── DATA LOADERS ──
    const loadContacts = async () => {
        setContactsLoading(true);
        try {
            const data = await TelephonyService.getLeadContacts(
                selectedStatuses.length > 0 ? { statuses: selectedStatuses } : undefined
            );
            setContacts(data);
        } catch (e) { console.error(e); }
        finally { setContactsLoading(false); }
    };

    useEffect(() => { if (activeTab === 'contacts' || activeTab === 'campaign') loadContacts(); }, [selectedStatuses]);

    const loadTemplates = async () => {
        setTemplatesLoading(true);
        try { setTemplates(await TelephonyService.getWhatsAppTemplates()); }
        catch (e) { console.error(e); }
        finally { setTemplatesLoading(false); }
    };

    const loadCampaigns = async () => {
        setCampaignsLoading(true);
        try { setCampaigns(await TelephonyService.getWhatsAppCampaigns()); }
        catch (e) { console.error(e); }
        finally { setCampaignsLoading(false); }
    };

    // ── TEMPLATE ACTIONS ──
    const handleSaveTemplate = async () => {
        if (!tplName.trim() || !tplBody.trim()) { toast.error('Wypełnij nazwę i treść'); return; }
        try {
            if (editingTemplate) {
                await TelephonyService.updateWhatsAppTemplate(editingTemplate.id, { name: tplName, category: tplCategory, body: tplBody, media_urls: tplMediaUrls });
                toast.success('Szablon zaktualizowany');
            } else {
                await TelephonyService.createWhatsAppTemplate({ name: tplName, category: tplCategory, body: tplBody, media_urls: tplMediaUrls.length > 0 ? tplMediaUrls : undefined });
                toast.success('Szablon utworzony');
            }
            setEditingTemplate(null); setTplName(''); setTplBody(''); setTplCategory('promotion'); setTplMediaUrls([]);
            await loadTemplates();
        } catch (e: any) { toast.error(e.message); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Tylko pliki graficzne'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
        setTplUploading(true);
        try {
            const url = await TelephonyService.uploadWhatsAppMedia(file);
            setTplMediaUrls(prev => [...prev, url]);
            toast.success('Zdjęcie dodane ✓');
        } catch (err: any) { toast.error(err.message || 'Błąd uploadu'); }
        finally { setTplUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Na pewno usunąć szablon?')) return;
        try { await TelephonyService.deleteWhatsAppTemplate(id); toast.success('Usunięto'); await loadTemplates(); }
        catch (e: any) { toast.error(e.message); }
    };

    const handleSubmitForApproval = async (templateId: string) => {
        try {
            toast.loading('Wysyłanie do zatwierdzenia Meta...', { id: 'approval' });
            await TelephonyService.submitTemplateForApproval(templateId);
            toast.success('Wysłano! Status: Oczekuje ⏳', { id: 'approval' });
            await loadTemplates();
        } catch (e: any) { toast.error(e.message, { id: 'approval' }); }
    };

    const handleCheckApprovalStatus = async (templateId: string) => {
        try {
            toast.loading('Sprawdzanie...', { id: 'status' });
            const result = await TelephonyService.checkTemplateApprovalStatus(templateId);
            const msgs: Record<string, string> = { approved: '✅ Zatwierdzony!', rejected: '❌ Odrzucony', pending: '⏳ Nadal oczekuje' };
            toast.success(msgs[result.status] || result.status, { id: 'status' });
            await loadTemplates();
        } catch (e: any) { toast.error(e.message, { id: 'status' }); }
    };

    // ── CAMPAIGN ACTIONS ──
    const personalize = (body: string, contact: Contact) => {
        return body
            .replace(/\{firstName\}/g, contact.firstName)
            .replace(/\{lastName\}/g, contact.lastName)
            .replace(/\{city\}/g, contact.city)
            .replace(/\{companyName\}/g, contact.companyName)
            .replace(/\{email\}/g, contact.email);
    };

    const handleLaunchCampaign = async () => {
        if (!campaignName.trim() || !campaignTemplate || campaignContacts.length === 0) {
            toast.error('Uzupełnij wszystkie pola'); return;
        }
        setCampaignSending(true);
        try {
            const campaign = await TelephonyService.createCampaign({
                name: campaignName,
                template_id: campaignTemplate.id,
                filters: { statuses: selectedStatuses },
            });
            const recipients = campaignContacts.map(c => ({
                lead_id: c.id,
                phone: c.phone,
                name: `${c.firstName} ${c.lastName}`.trim(),
                message_body: personalize(campaignTemplate.body, c),
            }));
            await TelephonyService.addCampaignRecipients(campaign.id, recipients);
            const result = await TelephonyService.launchCampaign(campaign.id);
            toast.success(`Kampania wysłana! ✅ ${result?.sent || 0} wiadomości`);
            setCampaignStep(1); setCampaignName(''); setCampaignTemplate(null); setCampaignContacts([]);
            setSelectedContacts(new Set());
            setActiveTab('history');
            await loadCampaigns();
        } catch (e: any) { toast.error(e.message || 'Błąd kampanii'); }
        finally { setCampaignSending(false); }
    };

    // ── HELPERS ──
    const filteredContacts = contacts.filter(c => {
        const q = contactSearch.toLowerCase();
        return !q || c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) ||
            c.phone.includes(q) || c.city.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q);
    });

    const toggleContact = (id: string) => {
        const s = new Set(selectedContacts);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelectedContacts(s);
    };
    const selectAll = () => {
        if (selectedContacts.size === filteredContacts.length) setSelectedContacts(new Set());
        else setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    };

    const tabs = [
        { key: 'contacts', label: 'Kontakty', emoji: '📋', count: contacts.length },
        { key: 'templates', label: 'Szablony', emoji: '✉️', count: templates.length },
        { key: 'campaign', label: 'Nowa kampania', emoji: '🚀' },
        { key: 'history', label: 'Historia', emoji: '📊', count: campaigns.length },
    ] as const;

    return (
        <div className="max-w-7xl mx-auto">
            {/* ═══ HERO HEADER ═══ */}
            <div className="relative overflow-hidden rounded-2xl mb-6" style={{ background: 'linear-gradient(135deg, #075E54 0%, #128C7E 40%, #25D366 100%)' }}>
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)' }} />
                </div>
                <div className="relative px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">WhatsApp Marketing</h1>
                            <p className="text-white/70 text-sm">Kampanie · Szablony · Personalizacja</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {[
                            { label: 'Kontakty', value: contacts.length, icon: '👥' },
                            { label: 'Szablony', value: templates.length, icon: '✉️' },
                            { label: 'Kampanie', value: campaigns.length, icon: '📊' },
                        ].map(s => (
                            <div key={s.label} className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/10 text-center min-w-[80px]">
                                <div className="text-2xl font-bold text-white">{s.value}</div>
                                <div className="text-[10px] text-white/60 font-medium">{s.icon} {s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ TAB NAVIGATION ═══ */}
            <div className="flex gap-2 mb-6">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`relative flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === t.key
                            ? 'text-white shadow-lg shadow-green-500/25'
                            : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                        style={activeTab === t.key ? { background: 'linear-gradient(135deg, #25D366, #128C7E)' } : {}}
                    >
                        <span className="text-base">{t.emoji}</span>
                        <span>{t.label}</span>
                        {'count' in t && t.count !== undefined && (
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${activeTab === t.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══════ CONTACTS TAB ═══════ */}
            {activeTab === 'contacts' && (
                <div>
                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-slate-700">🎯 Filtruj po statusie pipeline:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Zaznaczono: <strong className="text-green-600">{selectedContacts.size}</strong></span>
                                {selectedContacts.size > 0 && (
                                    <button
                                        onClick={() => {
                                            setCampaignContacts(filteredContacts.filter(c => selectedContacts.has(c.id)));
                                            setActiveTab('campaign');
                                            setCampaignStep(1);
                                        }}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg text-white transition-colors" style={{ background: WA_GREEN }}
                                    >
                                        🚀 Utwórz kampanię ({selectedContacts.size})
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {Object.entries(PIPELINE_STAGES).map(([key, stage]) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedStatuses(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedStatuses.includes(key) ? 'border-transparent text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                    style={selectedStatuses.includes(key) ? { background: stage.color } : {}}
                                >
                                    {stage.emoji} {stage.label}
                                </button>
                            ))}
                            {selectedStatuses.length > 0 && (
                                <button onClick={() => setSelectedStatuses([])} className="text-xs text-slate-400 hover:text-red-500 px-2">✕ Wyczyść</button>
                            )}
                        </div>
                        <input
                            value={contactSearch}
                            onChange={e => setContactSearch(e.target.value)}
                            placeholder="🔍 Szukaj po nazwisku, telefonie, mieście..."
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Contact List */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left">
                                        <input type="checkbox" checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0} onChange={selectAll} className="rounded" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Imię Nazwisko</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Telefon</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Miasto</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Firma</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contactsLoading ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Ładowanie kontaktów...</td></tr>
                                ) : filteredContacts.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Brak kontaktów z telefonem</td></tr>
                                ) : (
                                    filteredContacts.map(c => (
                                        <tr key={c.id} className={`border-b border-slate-50 hover:bg-green-50/50 cursor-pointer transition-colors ${selectedContacts.has(c.id) ? 'bg-green-50' : ''}`} onClick={() => toggleContact(c.id)}>
                                            <td className="px-4 py-3">
                                                <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={() => toggleContact(c.id)} className="rounded" />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800">{c.firstName} {c.lastName}</td>
                                            <td className="px-4 py-3 font-mono text-slate-600 text-xs">{c.phone}</td>
                                            <td className="px-4 py-3 text-slate-600">{c.city || '—'}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{c.companyName || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white" style={{ background: PIPELINE_STAGES[c.status]?.color || '#9CA3AF' }}>
                                                    {PIPELINE_STAGES[c.status]?.emoji} {PIPELINE_STAGES[c.status]?.label || c.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {!contactsLoading && <div className="px-4 py-3 text-xs text-slate-400 border-t bg-slate-50">Łącznie: {filteredContacts.length} kontaktów z telefonem</div>}
                    </div>
                </div>
            )}

            {/* ═══════ TEMPLATES TAB ═══════ */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Editor */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">{editingTemplate ? '✏️ Edytuj szablon' : '➕ Nowy szablon'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1 block">Nazwa szablonu</label>
                                <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="np. Promocja zimowa 2026" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1 block">Kategoria</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, cat]) => (
                                        <button key={key} onClick={() => setTplCategory(key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${tplCategory === key ? 'bg-green-500 text-white border-green-500' : 'border-slate-200 text-slate-500 hover:border-green-300'}`}>
                                            {cat.emoji} {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1 block">Treść wiadomości</label>
                                <textarea value={tplBody} onChange={e => setTplBody(e.target.value)} rows={6}
                                    placeholder="Guten Tag {firstName}! Wir möchten Ihnen unser aktuelles Angebot vorstellen..."
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {['{firstName}', '{lastName}', '{city}', '{companyName}'].map(v => (
                                        <button key={v} onClick={() => setTplBody(prev => prev + v)} className="px-2 py-1 bg-slate-100 hover:bg-green-100 text-xs text-slate-600 rounded-md font-mono transition-colors">{v}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Image Upload */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1 block">📸 Zdjęcia ({tplMediaUrls.length}/10)</label>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                {tplMediaUrls.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {tplMediaUrls.map((url, i) => (
                                            <div key={i} className="relative">
                                                <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                                                <button onClick={() => setTplMediaUrls(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {tplMediaUrls.length < 10 && (
                                    <button onClick={() => fileInputRef.current?.click()} disabled={tplUploading}
                                        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-green-400 hover:text-green-600 transition-colors w-full justify-center">
                                        {tplUploading ? (
                                            <><div className="w-4 h-4 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin" /> Uploading...</>
                                        ) : (
                                            <>📷 {tplMediaUrls.length > 0 ? 'Dodaj kolejne zdjęcie' : 'Dodaj zdjęcie realizacji, promocji...'}</>
                                        )}
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveTemplate} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors" style={{ background: WA_GREEN }}>
                                    {editingTemplate ? 'Zapisz zmiany' : 'Utwórz szablon'}
                                </button>
                                {editingTemplate && (
                                    <button onClick={() => { setEditingTemplate(null); setTplName(''); setTplBody(''); setTplCategory('promotion'); setTplMediaUrls([]); }}
                                        className="px-4 py-2.5 rounded-xl text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Anuluj</button>
                                )}
                            </div>
                        </div>

                        {/* Live Preview */}
                        {(tplBody || tplMediaUrls.length > 0) && (
                            <div className="mt-4 p-3 rounded-xl" style={{ background: '#0B141A' }}>
                                <div className="text-[10px] text-green-400 mb-2 font-bold">PODGLĄD</div>
                                <div className="inline-block max-w-[80%] rounded-lg overflow-hidden" style={{ background: '#005C4B' }}>
                                    {tplMediaUrls.length > 0 && (
                                        <div className={tplMediaUrls.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}>
                                            {tplMediaUrls.map((url, i) => <img key={i} src={url} alt="" className="w-full object-cover" style={{ maxHeight: tplMediaUrls.length === 1 ? '192px' : '96px' }} />)}
                                        </div>
                                    )}
                                    {tplBody && (
                                        <div className="px-3 py-2 text-sm text-white whitespace-pre-wrap">
                                            {personalize(tplBody, { id: '', firstName: 'Max', lastName: 'Mustermann', phone: '', email: '', city: 'Berlin', status: '', source: '', companyName: 'Muster GmbH' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Template List */}
                    <div className="space-y-3">
                        {templatesLoading ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">Ładowanie...</div>
                        ) : templates.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                                <div className="text-4xl mb-2">✉️</div>
                                <p className="text-slate-400 text-sm">Brak szablonów — utwórz pierwszy!</p>
                            </div>
                        ) : (
                            templates.map(tpl => (
                                <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full font-medium">
                                                {TEMPLATE_CATEGORIES[tpl.category]?.emoji} {TEMPLATE_CATEGORIES[tpl.category]?.label || tpl.category}
                                            </span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingTemplate(tpl); setTplName(tpl.name); setTplCategory(tpl.category); setTplBody(tpl.body); setTplMediaUrls(tpl.media_urls || []); }}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Edytuj">✏️</button>
                                            <button onClick={() => handleDeleteTemplate(tpl.id)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Usuń">🗑️</button>
                                        </div>
                                    </div>
                                    {/* Approval Status */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {tpl.twilio_approval_status === 'approved' ? (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold">✅ Zatwierdzony — kampanie dotrą do wszystkich</span>
                                        ) : tpl.twilio_approval_status === 'pending' ? (
                                            <>
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full font-bold">⏳ Oczekuje na zatwierdzenie</span>
                                                <button onClick={() => handleCheckApprovalStatus(tpl.id)}
                                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 rounded-full transition-colors">🔄 Sprawdź</button>
                                            </>
                                        ) : tpl.twilio_approval_status === 'rejected' ? (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-bold">❌ Odrzucony</span>
                                        ) : (
                                            <button onClick={() => handleSubmitForApproval(tpl.id)}
                                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] rounded-full font-bold transition-colors">📤 Wyślij do zatwierdzenia Meta</button>
                                        )}
                                    </div>
                                    {tpl.media_urls?.length > 0 && (
                                        <div className={tpl.media_urls.length === 1 ? '' : 'grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden mb-2'}>
                                            {tpl.media_urls.map((url: string, i: number) => <img key={i} src={url} alt="" className="w-full h-24 object-cover" />)}
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{tpl.body}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ CAMPAIGN TAB ═══════ */}
            {activeTab === 'campaign' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Steps indicator */}
                    <div className="flex border-b border-slate-200">
                        {[{ n: 1, label: 'Szablon', emoji: '✉️' }, { n: 2, label: 'Odbiorcy', emoji: '👥' }, { n: 3, label: 'Wyślij', emoji: '🚀' }].map(s => (
                            <div key={s.n} className={`flex-1 py-3 text-center text-sm font-medium transition-all ${campaignStep >= s.n ? 'text-green-700 border-b-2 border-green-500' : 'text-slate-400'}`}>
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${campaignStep >= s.n ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {campaignStep > s.n ? '✓' : s.n}
                                </span>
                                {s.emoji} {s.label}
                            </div>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* Step 1: Choose Template */}
                        {campaignStep === 1 && (
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Wybierz szablon wiadomości</h3>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-600 mb-1 block">Nazwa kampanii</label>
                                    <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="np. Promocja wiosenna 2026"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                {templates.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <p>Brak szablonów — najpierw utwórz w zakładce "Szablony"</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {templates.map(tpl => (
                                            <button key={tpl.id} onClick={() => setCampaignTemplate(tpl)}
                                                className={`text-left p-4 rounded-xl border-2 transition-all ${campaignTemplate?.id === tpl.id ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-300'}`}>
                                                {tpl.media_urls?.length > 0 && <img src={tpl.media_urls[0]} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />}
                                                <div className="font-bold text-sm text-slate-800 mb-1">{tpl.name}</div>
                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{TEMPLATE_CATEGORIES[tpl.category]?.emoji} {TEMPLATE_CATEGORIES[tpl.category]?.label}</span>
                                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{tpl.body}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-end mt-6">
                                    <button onClick={() => { if (campaignTemplate && campaignName.trim()) setCampaignStep(2); else toast.error('Wybierz szablon i wpisz nazwę'); }}
                                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: WA_GREEN }}>Dalej →</button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Choose Recipients */}
                        {campaignStep === 2 && (
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">Wybierz odbiorców ({campaignContacts.length > 0 ? campaignContacts.length : selectedContacts.size})</h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {Object.entries(PIPELINE_STAGES).map(([key, stage]) => (
                                        <button key={key} onClick={() => setSelectedStatuses(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedStatuses.includes(key) ? 'border-transparent text-white' : 'border-slate-200 text-slate-600'}`}
                                            style={selectedStatuses.includes(key) ? { background: stage.color } : {}}>
                                            {stage.emoji} {stage.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-xl">
                                    {filteredContacts.map(c => (
                                        <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-green-50/50 cursor-pointer ${selectedContacts.has(c.id) ? 'bg-green-50' : ''}`}>
                                            <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={() => toggleContact(c.id)} className="rounded" />
                                            <span className="font-medium text-sm text-slate-800 flex-1">{c.firstName} {c.lastName}</span>
                                            <span className="font-mono text-xs text-slate-500">{c.phone}</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: PIPELINE_STAGES[c.status]?.color || '#9CA3AF' }}>{PIPELINE_STAGES[c.status]?.label || c.status}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <button onClick={selectAll} className="text-xs text-green-600 hover:underline">{selectedContacts.size === filteredContacts.length ? 'Odznacz wszystko' : `Zaznacz wszystko (${filteredContacts.length})`}</button>
                                    <span className="text-sm text-slate-500">Zaznaczono: <strong className="text-green-600">{selectedContacts.size}</strong></span>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setCampaignStep(1)} className="px-6 py-2.5 rounded-xl text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">← Wstecz</button>
                                    <button onClick={() => { setCampaignContacts(filteredContacts.filter(c => selectedContacts.has(c.id))); setCampaignStep(3); }}
                                        disabled={selectedContacts.size === 0}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: WA_GREEN }}>
                                        Dalej → ({selectedContacts.size} odbiorców)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Preview & Send */}
                        {campaignStep === 3 && (
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4">📋 Podsumowanie kampanii</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <div className="text-xs text-slate-500 mb-1">Kampania</div>
                                        <div className="font-bold text-slate-800">{campaignName}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <div className="text-xs text-slate-500 mb-1">Szablon</div>
                                        <div className="font-bold text-slate-800">{campaignTemplate?.name}</div>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <div className="text-xs text-green-600 mb-1">Odbiorców</div>
                                        <div className="text-2xl font-bold text-green-700">{campaignContacts.length}</div>
                                    </div>
                                </div>

                                {/* Example preview */}
                                <div className="mb-6">
                                    <div className="text-xs font-bold text-slate-600 mb-2">Podgląd wiadomości (przykład):</div>
                                    <div className="p-4 rounded-xl" style={{ background: '#0B141A' }}>
                                        <div className="inline-block max-w-[80%] rounded-lg overflow-hidden" style={{ background: '#005C4B' }}>
                                            {campaignTemplate?.media_urls?.length > 0 && (
                                                <div className={campaignTemplate.media_urls.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}>
                                                    {campaignTemplate.media_urls.map((url: string, i: number) => <img key={i} src={url} alt="" className="w-full object-cover" style={{ maxHeight: campaignTemplate.media_urls.length === 1 ? '160px' : '80px' }} />)}
                                                </div>
                                            )}
                                            <div className="px-3 py-2 text-sm text-white whitespace-pre-wrap">
                                                {campaignContacts[0] ? personalize(campaignTemplate?.body || '', campaignContacts[0]) : campaignTemplate?.body}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recipient list */}
                                <div className="mb-6">
                                    <div className="text-xs font-bold text-slate-600 mb-2">Lista odbiorców:</div>
                                    <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-xl">
                                        {campaignContacts.map((c, i) => (
                                            <div key={c.id} className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 text-sm">
                                                <span className="text-slate-400 text-xs w-6">{i + 1}.</span>
                                                <span className="font-medium text-slate-800 flex-1">{c.firstName} {c.lastName}</span>
                                                <span className="font-mono text-xs text-slate-500">{c.phone}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
                                    ⚡ Wysyłka zajmie ok. <strong>{campaignContacts.length} sekund</strong> (1 wiadomość/sekundę — limit Twilio WhatsApp).
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setCampaignStep(2)} className="px-6 py-2.5 rounded-xl text-sm text-slate-600 bg-slate-100 hover:bg-slate-200">← Wstecz</button>
                                    <button onClick={handleLaunchCampaign} disabled={campaignSending}
                                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: WA_GREEN }}>
                                        {campaignSending ? (
                                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Wysyłanie kampanii...</>
                                        ) : (
                                            <>🚀 Wyślij kampanię ({campaignContacts.length} wiadomości)</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ HISTORY TAB ═══════ */}
            {activeTab === 'history' && (
                <div>
                    {campaignsLoading ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">Ładowanie...</div>
                    ) : campaigns.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <div className="text-4xl mb-2">📊</div>
                            <p className="text-slate-400 text-sm">Brak kampanii — utwórz pierwszą!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.map(camp => (
                                <div key={camp.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{camp.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-400">{new Date(camp.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                {camp.whatsapp_templates && (
                                                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full font-medium border border-green-100">
                                                        {TEMPLATE_CATEGORIES[camp.whatsapp_templates.category]?.emoji} {camp.whatsapp_templates.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${camp.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : camp.status === 'sending' ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' : camp.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}>
                                            {camp.status === 'completed' ? '✅ Wysłano' : camp.status === 'sending' ? '⏳ Wysyłanie...' : camp.status === 'draft' ? '📝 Szkic' : '❌ Anulowano'}
                                        </span>
                                    </div>
                                    {/* Progress bar */}
                                    {camp.total_recipients > 0 && (
                                        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((camp.sent_count || 0) / camp.total_recipients) * 100)}%`, background: 'linear-gradient(90deg, #25D366, #128C7E)' }} />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-4 gap-3 mt-3">
                                        <div className="rounded-xl p-3 text-center bg-slate-50">
                                            <div className="text-lg font-bold text-slate-800">{camp.total_recipients}</div>
                                            <div className="text-[10px] text-slate-500 font-medium">Odbiorców</div>
                                        </div>
                                        <div className="rounded-xl p-3 text-center bg-green-50">
                                            <div className="text-lg font-bold text-green-700">{camp.sent_count}</div>
                                            <div className="text-[10px] text-green-600 font-medium">Wysłano</div>
                                        </div>
                                        <div className="rounded-xl p-3 text-center bg-blue-50">
                                            <div className="text-lg font-bold text-blue-700">{camp.delivered_count}</div>
                                            <div className="text-[10px] text-blue-600 font-medium">Dostarczono</div>
                                        </div>
                                        <div className="rounded-xl p-3 text-center bg-red-50">
                                            <div className="text-lg font-bold text-red-700">{camp.failed_count}</div>
                                            <div className="text-[10px] text-red-600 font-medium">Błędy</div>
                                        </div>
                                    </div>
                                    <button onClick={async () => {
                                        setViewingCampaign(camp);
                                        try { setCampaignRecipients(await TelephonyService.getCampaignRecipients(camp.id)); } catch { }
                                    }} className="mt-3 text-xs font-semibold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1">Pokaż szczegóły →</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Campaign Detail Modal */}
                    {viewingCampaign && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setViewingCampaign(null); setCampaignRecipients([]); }}>
                            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                                    <h3 className="font-bold text-slate-800">📊 {viewingCampaign.name}</h3>
                                    <button onClick={() => { setViewingCampaign(null); setCampaignRecipients([]); }} className="text-slate-400 hover:text-slate-600">✕</button>
                                </div>
                                <div className="p-5 overflow-y-auto max-h-[60vh]">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-2 text-xs text-slate-500 font-bold">#</th>
                                                <th className="text-left py-2 text-xs text-slate-500 font-bold">Odbiorca</th>
                                                <th className="text-left py-2 text-xs text-slate-500 font-bold">Telefon</th>
                                                <th className="text-left py-2 text-xs text-slate-500 font-bold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {campaignRecipients.map((r, i) => (
                                                <tr key={r.id} className="border-b border-slate-50">
                                                    <td className="py-2 text-slate-400">{i + 1}</td>
                                                    <td className="py-2 font-medium text-slate-800">{r.name}</td>
                                                    <td className="py-2 font-mono text-xs text-slate-500">{r.phone}</td>
                                                    <td className="py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'sent' || r.status === 'delivered' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {r.status === 'sent' ? '✅ Wysłano' : r.status === 'delivered' ? '✅ Dostarczono' : r.status === 'failed' ? `❌ ${r.error_message || 'Błąd'}` : '⏳ Oczekuje'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
