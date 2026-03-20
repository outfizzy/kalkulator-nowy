import React, { useState, useEffect, useMemo } from 'react';
import { EmailTemplateService } from '../../services/database/email-template.service';
import type { EmailTemplate } from '../../services/database/email-template.service';
import { EmailFooterService } from '../../services/database/email-footer.service';
import type { EmailFooter } from '../../services/database/email-footer.service';
import { TemplateEditorModal } from '../../components/mail/TemplateEditorModal';
import { FooterEditorModal } from '../../components/mail/FooterEditorModal';
import { EmailPreviewModal } from '../../components/mail/EmailPreviewModal';
import { getSystemTemplates, wrapInBrandTemplate, textToEmailHtml } from '../../utils/emailBrandKit';
import { getCampaignTemplates } from '../../components/campaigns/CampaignTemplates';
import { generateLeadSalesEmailHtml } from '../../components/leads/leadSalesEmailTemplate';
import { toast } from 'react-hot-toast';

export const EmailTemplatesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'gallery' | 'system' | 'templates' | 'footers'>('gallery');

    // Templates State
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | undefined>(undefined);

    // Footers State
    const [footers, setFooters] = useState<EmailFooter[]>([]);
    const [loadingFooters, setLoadingFooters] = useState(true);
    const [isFooterEditorOpen, setIsFooterEditorOpen] = useState(false);
    const [editingFooter, setEditingFooter] = useState<EmailFooter | undefined>(undefined);

    // Preview State
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // System templates
    const systemTemplates = getSystemTemplates();

    useEffect(() => {
        if (activeTab === 'templates') loadTemplates();
        else if (activeTab === 'footers') loadFooters();
    }, [activeTab]);

    // --- Templates Handlers ---
    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await EmailTemplateService.getTemplates(false);
            setTemplates(data);
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania szablonów');
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) return;
        try {
            await EmailTemplateService.deleteTemplate(id);
            toast.success('Usunięto szablon');
            loadTemplates();
        } catch (error) {
            console.error(error);
            toast.error('Błąd usuwania');
        }
    };

    const handleEditTemplate = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setIsTemplateEditorOpen(true);
    };

    const handleCreateTemplate = () => {
        setEditingTemplate(undefined);
        setIsTemplateEditorOpen(true);
    };

    const handlePreviewDbTemplate = (template: EmailTemplate) => {
        // Wrap the DB template body in brand wrapper
        const htmlBody = template.body.includes('<') ? template.body : textToEmailHtml(template.body);
        setPreviewTitle(template.name);
        setPreviewHtml(wrapInBrandTemplate(htmlBody));
        setIsPreviewOpen(true);
    };

    // --- Footers Handlers ---
    const loadFooters = async () => {
        setLoadingFooters(true);
        try {
            const data = await EmailFooterService.getFooters(false);
            setFooters(data);
        } catch (error) {
            console.error(error);
            toast.error('Błąd ładowania stopek');
        } finally {
            setLoadingFooters(false);
        }
    };

    const handleDeleteFooter = async (id: string) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tę stopkę?')) return;
        try {
            await EmailFooterService.deleteFooter(id);
            toast.success('Usunięto stopkę');
            loadFooters();
        } catch (error) {
            console.error(error);
            toast.error('Błąd usuwania');
        }
    };

    const handleEditFooter = (footer: EmailFooter) => {
        setEditingFooter(footer);
        setIsFooterEditorOpen(true);
    };

    const handleCreateFooter = () => {
        setEditingFooter(undefined);
        setIsFooterEditorOpen(true);
    };

    const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
        offer: { label: 'Oferta', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '📄' },
        sales: { label: 'Sprzedaż', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '💰' },
        fair: { label: 'Targi', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '🎪' },
        service: { label: 'Serwis', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: '🔧' },
        installation: { label: 'Montaż', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: '🏗️' },
        campaign: { label: 'Kampania', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '📧' },
        lead: { label: 'Lead', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', icon: '🎯' },
    };

    // Build unified gallery items
    const allTemplates = useMemo(() => {
        const items: { id: string; name: string; description: string; trigger: string; category: string; source: string; getPreview: () => string }[] = [];

        // 1. System templates from emailBrandKit
        systemTemplates.forEach(t => {
            const triggers: Record<string, string> = {
                system_offer: '⚙️ Automatycznie — przy wysyłce oferty PDF do klienta',
                system_fair_catalog: '⚙️ Automatycznie — follow-up po targach z katalogiem',
                system_welcome: '⚙️ Automatycznie — po pierwszym kontakcie klienta',
                system_send_offer: '⚙️ Automatycznie — email z wycenąi ofertą',
                system_followup: '⚙️ Automatycznie — follow-up po braku odpowiedzi',
                system_service_ack: '⚙️ Automatycznie — potwierdzenie zgłoszenia serwisowego',
                system_installation_confirm: '⚙️ Automatycznie — potwierdzenie terminu montażu',
                system_installation_complete: '⚙️ Automatycznie — po zakończeniu montażu + prośba o opinię',
                system_service_form_link: '⚙️ Automatycznie — link do formularza serwisowego',
                system_feedback_request: '⚙️ Automatycznie — prośba o feedback po montażu',
            };
            items.push({
                id: t.id,
                name: t.name,
                description: t.description,
                trigger: triggers[t.id] || '⚙️ Systemowy',
                category: t.category,
                source: 'System',
                getPreview: () => t.previewHtml(),
            });
        });

        // 2. Campaign templates
        const campaignTemplates = getCampaignTemplates();
        const campaignTriggers: Record<string, string> = {
            letzte_referenz: '📧 Ręcznie — kampania "Ostatnia realizacja w pobliżu" (wysyłka do klientów w promieniu od realizacji)',
            sonderaktion: '📧 Ręcznie — kampania promocyjna z rabatem i deadline\'em',
            neuer_katalog: '📧 Ręcznie — kampania z nowym katalogiem produktów',
        };
        campaignTemplates.forEach(t => {
            items.push({
                id: `campaign_${t.id}`,
                name: `[Kampania] ${t.name}`,
                description: t.description,
                trigger: campaignTriggers[t.id] || '📧 Ręcznie — kampania mailowa',
                category: 'campaign',
                source: 'Kampania',
                getPreview: () => t.previewHtml({
                    projectTitle: 'Premium Terrassenüberdachung SkyStyle',
                    projectLocation: 'Berlin-Charlottenburg',
                    projectModel: 'SkyStyle 6000',
                    projectDimensions: '6000 × 4000 mm',
                    projectColor: 'RAL 7016 Anthrazitgrau',
                    projectDescription: 'Hochwertige Aluminium-Terrassenüberdachung mit VSG-Verglasung und integrierter LED-Beleuchtung.',
                    heroImage: 'https://polendach24.de/wp-content/uploads/2025/06/trendstyle-1024x682.webp',
                    galleryImages: [],
                    ctaUrl: 'https://polendach24.de',
                    ctaText: 'Jetzt Beratung anfragen',
                    promoTitle: 'Frühlings-Aktion 2026',
                    promoSubtitle: 'Nur für kurze Zeit',
                    promoDiscount: '15% Rabatt',
                    promoDeadline: '31.03.2026',
                    promoDescription: 'Sichern Sie sich jetzt Ihre Premium-Terrassenüberdachung zum Sonderpreis.',
                    promoProducts: 'Terrassenüberdachungen, Carports, Pergolen',
                }),
            });
        });

        // 3. Schneelast Lead Welcome Email
        items.push({
            id: 'lead_schneelast',
            name: 'Schneelastzone – Projektbestätigung',
            description: 'Powitalny email dla leada — potwierdza strefę śnieżną, prezentuje konfigurację i zespół doradców. Zachęca do skonfigurowania dachu online.',
            trigger: '🎯 Automatycznie — po zapisaniu leada z Schneelastzone (formularz na stronie)',
            category: 'lead',
            source: 'Lead',
            getPreview: () => generateLeadSalesEmailHtml({
                customerName: 'Max Mustermann',
                postalCode: '03044',
                snowZone: '2',
                snowLoad: '0.85',
                configuratorUrl: 'https://polendach24.app/konfigurator?ref=demo',
            }),
        });

        return items;
    }, [systemTemplates]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Komunikacja E-mail</h1>
                    <p className="text-slate-500">Zarządzaj szablonami wiadomości, identyfikacją marki i stopkami firmowymi.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg flex-wrap gap-0.5">
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'gallery' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        📋 Galeria
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'system' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        🎨 Identyfikacja
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'templates' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Szablony
                    </button>
                    <button
                        onClick={() => setActiveTab('footers')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'footers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Stopki
                    </button>
                </div>
            </div>

            {/* ACTION BAR */}
            {activeTab === 'templates' && (
                <div className="flex justify-end">
                    <button
                        onClick={handleCreateTemplate}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowy Szablon
                    </button>
                </div>
            )}
            {activeTab === 'footers' && (
                <div className="flex justify-end">
                    <button
                        onClick={handleCreateFooter}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowa Stopka
                    </button>
                </div>
            )}

            {/* ═══════ GALLERY TAB ═══════ */}
            {activeTab === 'gallery' && (
                <div className="space-y-4">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">📋</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Galeria Wszystkich Szablonów E-mail</h2>
                                <p className="text-blue-200 text-sm mt-1">
                                    Podgląd {allTemplates.length} szablonów z całego systemu — z przykładowymi danymi. Kliknij "Podgląd" aby zobaczyć co otrzymuje klient.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {allTemplates.map((tmpl, idx) => {
                            const cat = CATEGORY_LABELS[tmpl.category] || CATEGORY_LABELS.sales;
                            return (
                                <div key={tmpl.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                    {/* Category stripe */}
                                    <div className={`h-1.5 ${tmpl.category === 'campaign' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : tmpl.category === 'lead' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : tmpl.category === 'installation' ? 'bg-gradient-to-r from-violet-500 to-purple-500' : tmpl.category === 'service' ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-gradient-to-r from-slate-700 via-blue-600 to-slate-700'}`} />

                                    <div className="p-5">
                                        {/* Badges row */}
                                        <div className="flex items-start justify-between mb-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cat.bg} ${cat.color}`}>
                                                {cat.icon} {cat.label}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium">
                                                {tmpl.source}
                                            </span>
                                        </div>

                                        {/* Number badge */}
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-sm leading-tight">{tmpl.name}</h3>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{tmpl.description}</p>

                                        {/* Trigger info */}
                                        <div className="bg-slate-50 rounded-lg px-3 py-2 mb-4 border border-slate-100">
                                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                                <span className="font-bold text-slate-700">Wyzwalacz: </span>
                                                {tmpl.trigger}
                                            </p>
                                        </div>

                                        {/* Preview button */}
                                        <button
                                            onClick={() => {
                                                setPreviewTitle(tmpl.name);
                                                setPreviewHtml(tmpl.getPreview());
                                                setIsPreviewOpen(true);
                                            }}
                                            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 rounded-lg transition-colors text-sm font-bold flex items-center justify-center gap-2 border border-blue-200 hover:border-blue-300"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Podgląd z przykładowymi danymi
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════ SYSTEM TEMPLATES TAB ═══════ */}
            {activeTab === 'system' && (
                <div className="space-y-4">
                    {/* Brand Identity Banner */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">System Identyfikacji Marki E-mail</h2>
                            <p className="text-slate-400 text-sm mt-1">
                                Wszystkie szablony systemowe korzystają ze wspólnej szaty graficznej PolenDach24 — jednolity nagłówek, stopka firmowa, kolorystyka i układ.
                            </p>
                        </div>
                    </div>

                    {/* System Templates Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {systemTemplates.map(tmpl => {
                            const cat = CATEGORY_LABELS[tmpl.category] || CATEGORY_LABELS.sales;
                            return (
                                <div key={tmpl.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                    {/* Mini Preview Stripe */}
                                    <div className="h-2 bg-gradient-to-r from-slate-800 via-blue-600 to-slate-800" />

                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cat.bg} ${cat.color}`}>
                                                {cat.label}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-medium uppercase">
                                                Systemowy
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-sm mb-2">{tmpl.name}</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed mb-4">{tmpl.description}</p>
                                        <button
                                            onClick={() => {
                                                setPreviewTitle(tmpl.name);
                                                setPreviewHtml(tmpl.previewHtml());
                                                setIsPreviewOpen(true);
                                            }}
                                            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 border border-slate-200 hover:border-blue-200"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Podgląd
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════ DB TEMPLATES TAB ═══════ */}
            {activeTab === 'templates' && (
                loadingTemplates ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Nazwa</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Temat</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Kategoria</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {templates.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                            Brak szablonów. Utwórz pierwszy szablon klikając przycisk powyżej.
                                        </td>
                                    </tr>
                                ) : (
                                    templates.map(template => (
                                        <tr key={template.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-800">{template.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{template.subject}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium uppercase tracking-wide">
                                                    {template.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {template.is_active ? (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Aktywny</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Nieaktywny</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handlePreviewDbTemplate(template)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Podgląd">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleEditTemplate(template)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* ═══════ FOOTERS TAB ═══════ */}
            {activeTab === 'footers' && (
                loadingFooters ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Nazwa Stopki</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Podgląd (Fragment)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {footers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                            Brak stopek. Utwórz pierwszą stopkę klikając przycisk powyżej.
                                        </td>
                                    </tr>
                                ) : (
                                    footers.map(footer => (
                                        <tr key={footer.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-800">{footer.name}</td>
                                            <td className="px-6 py-4 text-slate-600 truncate max-w-xs text-xs font-mono">
                                                {footer.content.substring(0, 50)}...
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {footer.is_active ? (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Aktywna</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Nieaktywna</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditFooter(footer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteFooter(footer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* MODALS */}
            <TemplateEditorModal
                isOpen={isTemplateEditorOpen}
                onClose={() => setIsTemplateEditorOpen(false)}
                template={editingTemplate}
                onSuccess={loadTemplates}
            />
            <FooterEditorModal
                isOpen={isFooterEditorOpen}
                onClose={() => setIsFooterEditorOpen(false)}
                footer={editingFooter}
                onSuccess={loadFooters}
            />
            <EmailPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                html={previewHtml}
                title={previewTitle}
            />
        </div>
    );
};
