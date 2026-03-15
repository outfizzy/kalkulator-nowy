import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FacebookService } from '../../services/database/facebook.service';
import { LeadService } from '../../services/database/lead.service';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════
// AI ASSISTANT TAB — Claude-powered FB tools
// ═══════════════════════════════════════════

type AIMode = 'advisor' | 'improver' | 'competitor' | 'quick';

export function AIAssistantTab() {
    const [mode, setMode] = useState<AIMode>('advisor');
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [quickType, setQuickType] = useState('realization');

    const modes = [
        { id: 'advisor' as AIMode, label: '📊 Doradca', desc: 'AI analizuje Twoje posty i podpowiada co dalej' },
        { id: 'improver' as AIMode, label: '✍️ Ulepszacz', desc: 'Wklej tekst → AI go poprawi' },
        { id: 'competitor' as AIMode, label: '🏆 Konkurencja', desc: 'Wklej post konkurenta → AI da lepszą wersję' },
        { id: 'quick' as AIMode, label: '⚡ Szybki Post', desc: 'Jeden klik = gotowy post' },
    ];

    const quickTypes = [
        { id: 'realization', label: '🏗️ Realizacja', prompt: 'Wygeneruj post o realizacji terrassenüberdachung. Miasto: {city}. Produkt: {product}.' },
        { id: 'seasonal', label: '🌸 Sezonowy', prompt: 'Wygeneruj sezonowy post dla aktualnej pory roku (marzec 2026). Temat: wiosenne planowanie zadaszeń.' },
        { id: 'tip', label: '📚 Tipp', prompt: 'Wygeneruj ekspercki tip na temat: {topic}' },
        { id: 'question', label: '❓ Pytanie', prompt: 'Wygeneruj angażujący post z pytaniem do community na temat zadaszeń tarasowych.' },
        { id: 'behind', label: '🔧 Za kulisami', prompt: 'Wygeneruj post za kulisami montażu terrassenüberdachung.' },
    ];

    const callAI = async (analysisType: string, businessData: string) => {
        setLoading(true);
        setResult('');
        try {
            const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
                body: { analysisType, businessData, customPrompt: '' }
            });
            if (error) throw error;
            setResult(data.content || 'Brak odpowiedzi');
        } catch (err: any) {
            toast.error('AI Error: ' + err.message);
            setResult('⚠️ ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdvisor = async () => {
        try {
            const posts = await FacebookService.getFBPosts().catch(() => ({ data: [] }));
            const postSummary = (posts.data || []).slice(0, 10).map((p: any) =>
                `- [${new Date(p.created_time).toLocaleDateString('de-DE')}] ${(p.message || '(photo)').substring(0, 100)}... | Shares: ${p.shares?.count || 0}`
            ).join('\n');
            const data = `Ostatnie posty na FB Polendach24:\n${postSummary || 'Brak danych o postach'}\n\nAktualna data: ${new Date().toLocaleDateString('de-DE')}\nSezon: Marzec 2026 (początek sezonu)\nBranża: Terrassenüberdachungen, Carports, Pergolen\nRynek: Niemcy`;
            await callAI('fb_post_advisor', data);
        } catch (err: any) { toast.error(err.message); }
    };

    const handleImprover = async () => {
        if (!input.trim()) return toast.error('Wklej tekst posta do ulepszenia');
        await callAI('fb_post_improver', `Tekst posta do ulepszenia:\n\n${input}`);
    };

    const handleCompetitor = async () => {
        if (!input.trim()) return toast.error('Wklej treść posta konkurenta');
        await callAI('fb_competitor_analysis', `Treść/strategia konkurenta:\n\n${input}`);
    };

    const handleQuick = async () => {
        const qt = quickTypes.find(q => q.id === quickType);
        const topic = qt?.prompt.replace('{city}', input || 'Düsseldorf').replace('{product}', 'Terrassenüberdachung').replace('{topic}', input || 'Aluminium vs. Holz') || 'Terrassenüberdachung';
        await callAI('fb_post_generator', `Thema: ${topic}${input ? `\nZusätzlicher Kontext: ${input}` : ''}`);
    };

    const extractPostText = (markdown: string) => {
        // Try to extract from markdown sections first
        const match = markdown.match(/### (?:✅ Ulepszona wersja|✨ Gotowy szkic posta|✨ Gotowy post-odpowiedź):\s*\n([\s\S]*?)(?=\n###|\n---|\n\*)/);
        if (match) return match[1].trim();
        // For clean fb_post_generator output (no markdown), return full text
        const cleaned = markdown.replace(/^#+\s.*$/gm, '').replace(/^---.*$/gm, '').replace(/^\*.*Powered by Claude\*$/gm, '').trim();
        return cleaned || markdown.trim();
    };

    const handlePublishFromResult = async () => {
        const text = extractPostText(result);
        if (!text) return toast.error('Nie znaleziono tekstu posta w wyniku AI');
        setPublishing(true);
        try {
            await FacebookService.publishPost({ message: text });
            await FacebookService.saveLocalPost({ content: text, media_urls: [], post_type: 'text', status: 'published', published_at: new Date().toISOString() });
            toast.success('✅ Opublikowano na FB!');
        } catch (err: any) { toast.error(err.message); }
        finally { setPublishing(false); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 rounded-2xl p-5 text-white">
                <h2 className="text-xl font-bold">🤖 AI Asystent Facebook</h2>
                <p className="text-purple-200 text-sm mt-1">Claude AI — doradca, ulepszacz postów, analiza konkurencji</p>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {modes.map(m => (
                    <button key={m.id} onClick={() => { setMode(m.id); setResult(''); }}
                        className={`p-4 rounded-xl border text-left transition-all ${mode === m.id ? 'border-violet-400 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
                        <p className="font-bold text-sm text-slate-800">{m.label}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{m.desc}</p>
                    </button>
                ))}
            </div>

            {/* Input area */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                {mode === 'advisor' && (
                    <div className="text-center space-y-3">
                        <p className="text-sm text-slate-600">AI pobierze Twoje ostatnie posty z FB i zaproponuje następne kroki.</p>
                        <button onClick={handleAdvisor} disabled={loading}
                            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-sm">
                            {loading ? '⏳ Analizuję posty...' : '📊 Analizuj i doradzaj'}
                        </button>
                    </div>
                )}

                {mode === 'improver' && (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Wklej tekst posta do ulepszenia:</label>
                        <textarea value={input} onChange={e => setInput(e.target.value)} rows={6} placeholder="Wklej tu treść posta, którą chcesz ulepszyć..."
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                        <button onClick={handleImprover} disabled={loading || !input.trim()}
                            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 text-sm">
                            {loading ? '⏳ Ulepszam...' : '✨ Ulepsz post z AI'}
                        </button>
                    </div>
                )}

                {mode === 'competitor' && (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Wklej treść posta konkurenta:</label>
                        <textarea value={input} onChange={e => setInput(e.target.value)} rows={6} placeholder="Wklej tu post konkurenta (Weinor, Warema, Solarlux, Schweng, KD Überdachung...)"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none" />
                        <button onClick={handleCompetitor} disabled={loading || !input.trim()}
                            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-bold disabled:opacity-50 text-sm">
                            {loading ? '⏳ Analizuję...' : '🏆 Analizuj i pobij!'}
                        </button>
                    </div>
                )}

                {mode === 'quick' && (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Szybki generator — wybierz typ:</label>
                        <div className="flex flex-wrap gap-2">
                            {quickTypes.map(q => (
                                <button key={q.id} onClick={() => setQuickType(q.id)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium ${quickType === q.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                    {q.label}
                                </button>
                            ))}
                        </div>
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Opcjonalnie: miasto, temat, produkt..."
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none" />
                        <button onClick={handleQuick} disabled={loading}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold disabled:opacity-50 text-sm">
                            {loading ? '⏳ Generuję...' : '⚡ Generuj szybki post'}
                        </button>
                    </div>
                )}
            </div>

            {/* AI Result */}
            {result && (
                <div className="bg-white rounded-xl border-2 border-violet-300 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-violet-700">🤖 Odpowiedź AI:</p>
                        <div className="flex gap-2">
                            <button onClick={handlePublishFromResult} disabled={publishing}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                                {publishing ? '...' : '🚀 Publikuj na FB'}
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(result); toast.success('📋 Skopiowano!'); }}
                                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200">📋 Kopiuj</button>
                        </div>
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>').replace(/## /g, '<h3 class="text-lg font-bold text-slate-800 mt-4 mb-2">').replace(/### /g, '<h4 class="text-sm font-bold text-slate-700 mt-3 mb-1">').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/---/g, '<hr class="my-3 border-slate-200" />') }} />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// CONTACTS TAB — Facebook Contacts Pipeline
// ═══════════════════════════════════════════

interface FBContact {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    phone_formatted: string | null;
    city: string | null;
    campaign_name: string | null;
    source: string;
    status: string;
    quality_score: number;
    call_attempts: number;
    emails_sent: number;
    sms_sent: number;
    last_sms_at: string | null;
    last_email_at: string | null;
    notes: string | null;
    ai_analysis: string | null;
    converted_lead_id: string | null;
    created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    new: { label: 'Nowy', color: 'bg-blue-100 text-blue-700', icon: '🆕' },
    contacted: { label: 'Kontaktowany', color: 'bg-yellow-100 text-yellow-700', icon: '📞' },
    qualified: { label: 'Kwalifikowany', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
    converted: { label: 'Przekonwertowany', color: 'bg-green-100 text-green-700', icon: '🎯' },
    rejected: { label: 'Odrzucony', color: 'bg-red-100 text-red-700', icon: '❌' },
    ghost: { label: 'Ghost', color: 'bg-slate-100 text-slate-500', icon: '👻' },
};

export function ContactsTab() {
    const [contacts, setContacts] = useState<FBContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [filter, setFilter] = useState('all');
    const [newContact, setNewContact] = useState({ full_name: '', email: '', phone: '', city: '', campaign_name: '', source: 'lead_form', notes: '' });
    const [analyzing, setAnalyzing] = useState<string | null>(null);
    const [sendingAction, setSendingAction] = useState<string | null>(null); // 'sms-{id}', 'email-{id}', 'lead-{id}'

    // ── SEND SMS with form link ──
    const handleSendSMS = async (contact: FBContact) => {
        const phone = contact.phone_formatted || contact.phone;
        if (!phone) return toast.error('Brak numeru telefonu!');
        setSendingAction(`sms-${contact.id}`);
        try {
            const formUrl = 'https://polendach24.app/konfigurator';
            const name = contact.full_name?.split(' ')[0] || 'Interessent';
            const body = `Hallo ${name}! Vielen Dank für Ihre Anfrage bei Polendach24. Damit wir Ihnen schnell ein passendes Angebot erstellen können, füllen Sie bitte unser kurzes Formular aus: ${formUrl} — Ihr Polendach24-Team ☀️`;

            const { error } = await supabase.functions.invoke('twilio-handler', {
                body: { action: 'send_sms', to: phone, body }
            });
            if (error) throw error;

            // Update contact tracking
            await supabase.from('facebook_contacts').update({
                sms_sent: (contact.sms_sent || 0) + 1,
                last_sms_at: new Date().toISOString(),
                status: contact.status === 'new' ? 'contacted' : contact.status,
                updated_at: new Date().toISOString(),
            }).eq('id', contact.id);

            toast.success(`📱 SMS wysłany do ${phone}!`);
            loadContacts();
        } catch (err: any) { toast.error('SMS Error: ' + err.message); }
        finally { setSendingAction(null); }
    };

    // ── SEND EMAIL with form link ──
    const handleSendEmail = async (contact: FBContact) => {
        if (!contact.email) return toast.error('Brak adresu email!');
        setSendingAction(`email-${contact.id}`);
        try {
            const name = contact.full_name?.split(' ')[0] || 'Interessent';
            const formUrl = 'https://polendach24.app/konfigurator';

            const html = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Polendach24</h1>
                        <p style="color: #bfdbfe; margin: 8px 0 0 0;">Terrassenüberdachungen • Carports • Pergolen</p>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #1e293b;">Hallo ${name},</h2>
                        <p style="color: #475569; line-height: 1.6;">vielen Dank für Ihr Interesse an unseren Produkten! Um Ihnen schnell und individuell ein Angebot erstellen zu können, bitten wir Sie, unser kurzes Formular auszufüllen:</p>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${formUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">📋 Jetzt Formular ausfüllen</a>
                        </div>
                        <p style="color: #475569; line-height: 1.6;">Das dauert nur 2-3 Minuten und hilft uns, Ihnen das beste Angebot zu erstellen.</p>
                        <p style="color: #475569;">Bei Fragen stehen wir Ihnen jederzeit zur Verfügung!</p>
                        <p style="color: #1e293b; font-weight: bold;">Ihr Polendach24-Team ☀️</p>
                    </div>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Polendach24 | Premium Aluminium Überdachungen</p>
                    </div>
                </div>`;

            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: contact.email,
                    subject: `${name}, Ihr individuelles Angebot wartet! — Polendach24`,
                    html,
                }
            });
            if (error) throw error;

            await supabase.from('facebook_contacts').update({
                emails_sent: (contact.emails_sent || 0) + 1,
                last_email_at: new Date().toISOString(),
                status: contact.status === 'new' ? 'contacted' : contact.status,
                updated_at: new Date().toISOString(),
            }).eq('id', contact.id);

            toast.success(`📧 Email wysłany do ${contact.email}!`);
            loadContacts();
        } catch (err: any) { toast.error('Email Error: ' + err.message); }
        finally { setSendingAction(null); }
    };

    // ── MOVE TO LEADS ──
    const handleMoveToLeads = async (contact: FBContact) => {
        if (contact.converted_lead_id) return toast.error('Kontakt już przeniesiony do leadów!');
        setSendingAction(`lead-${contact.id}`);
        try {
            const nameParts = (contact.full_name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const lead = await LeadService.createLead({
                status: 'new',
                source: 'facebook' as any,
                customerData: {
                    firstName,
                    lastName,
                    email: contact.email || '',
                    phone: contact.phone || '',
                    city: contact.city || '',
                    postalCode: '',
                    address: '',
                },
                notes: `[FB Kontakt] Kampania: ${contact.campaign_name || '-'} | Źródło: ${contact.source} | SMS: ${contact.sms_sent || 0}x | Email: ${contact.emails_sent || 0}x${contact.notes ? '\n' + contact.notes : ''}${contact.ai_analysis ? '\n\n🤖 AI: ' + contact.ai_analysis.substring(0, 300) : ''}`,
            });

            // Auto-assign lead
            await LeadService.autoAssignIfNeeded(lead.id);

            // Update FB contact
            await supabase.from('facebook_contacts').update({
                status: 'converted',
                converted_lead_id: lead.id,
                updated_at: new Date().toISOString(),
            }).eq('id', contact.id);

            toast.success('🎯 Przeniesiono do Leadów! Lead ID: ' + lead.id.substring(0, 8));
            loadContacts();
        } catch (err: any) { toast.error('Lead Error: ' + err.message); }
        finally { setSendingAction(null); }
    };

    useEffect(() => { loadContacts(); }, []);

    const loadContacts = async () => {
        try {
            const { data, error } = await supabase.from('facebook_contacts').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setContacts(data || []);
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    };

    const handleAdd = async () => {
        if (!newContact.full_name && !newContact.phone && !newContact.email) return toast.error('Podaj min. imię, telefon lub email');
        try {
            // Format phone
            let phoneFormatted = newContact.phone;
            if (phoneFormatted) {
                phoneFormatted = phoneFormatted.replace(/\s+/g, '').replace(/^00/, '+');
                if (phoneFormatted.startsWith('0') && !phoneFormatted.startsWith('+')) phoneFormatted = '+49' + phoneFormatted.substring(1);
            }
            const { error } = await supabase.from('facebook_contacts').insert({
                ...newContact,
                phone_formatted: phoneFormatted,
                status: 'new',
                quality_score: 0,
            });
            if (error) throw error;
            toast.success('✅ Kontakt dodany!');
            setNewContact({ full_name: '', email: '', phone: '', city: '', campaign_name: '', source: 'lead_form', notes: '' });
            setShowAdd(false);
            loadContacts();
        } catch (err: any) { toast.error(err.message); }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase.from('facebook_contacts').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            toast.success(`Status: ${STATUS_CONFIG[status]?.label}`);
            loadContacts();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleAIAnalyze = async (contact: FBContact) => {
        setAnalyzing(contact.id);
        try {
            const { data, error } = await supabase.functions.invoke('morning-coffee-ai', {
                body: {
                    analysisType: 'fb_contact_qualifier',
                    businessData: `Kontakt Facebook:\nImię: ${contact.full_name || 'brak'}\nEmail: ${contact.email || 'brak'}\nTelefon: ${contact.phone || 'brak'}\nMiasto: ${contact.city || 'brak'}\nKampania: ${contact.campaign_name || 'brak'}\nŹródło: ${contact.source}\nPróby kontaktu: ${contact.call_attempts}\nNotatki: ${contact.notes || 'brak'}`,
                }
            });
            if (error) throw error;
            // Save AI analysis to contact
            await supabase.from('facebook_contacts').update({ ai_analysis: data.content, updated_at: new Date().toISOString() }).eq('id', contact.id);
            toast.success('🤖 Analiza AI zapisana!');
            loadContacts();
        } catch (err: any) { toast.error(err.message); }
        finally { setAnalyzing(null); }
    };

    const filtered = filter === 'all' ? contacts : contacts.filter(c => c.status === filter);
    const counts = contacts.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {} as Record<string, number>);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">📋 Kontakty Facebook</h2>
                        <p className="text-blue-100 text-sm mt-1">Pipeline kontaktów z kampanii FB — przed dodaniem do leadów</p>
                    </div>
                    <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-sm font-medium hover:bg-white/30">
                        ➕ Dodaj kontakt
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                <button onClick={() => setFilter('all')} className={`p-3 rounded-xl text-center transition-all ${filter === 'all' ? 'bg-slate-800 text-white shadow' : 'bg-white border border-slate-200'}`}>
                    <p className="text-lg font-bold">{contacts.length}</p>
                    <p className="text-[10px]">Wszystkie</p>
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setFilter(key)} className={`p-3 rounded-xl text-center transition-all ${filter === key ? 'shadow ring-2 ring-blue-400 ' + cfg.color : 'bg-white border border-slate-200'}`}>
                        <p className="text-lg font-bold">{counts[key] || 0}</p>
                        <p className="text-[10px]">{cfg.icon} {cfg.label}</p>
                    </button>
                ))}
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-3 shadow-lg">
                    <h3 className="font-bold text-slate-800 text-sm">➕ Nowy kontakt z Facebook</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} placeholder="Imię i nazwisko" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={newContact.city} onChange={e => setNewContact(p => ({ ...p, city: e.target.value }))} placeholder="Miasto" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={newContact.campaign_name} onChange={e => setNewContact(p => ({ ...p, campaign_name: e.target.value }))} placeholder="Kampania" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <select value={newContact.source} onChange={e => setNewContact(p => ({ ...p, source: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                            <option value="lead_form">Lead Form</option>
                            <option value="messenger">Messenger</option>
                            <option value="comment">Komentarz</option>
                            <option value="manual">Ręcznie</option>
                        </select>
                    </div>
                    <textarea value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} placeholder="Notatki..." rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                    <button onClick={handleAdd} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700">✅ Dodaj kontakt</button>
                </div>
            )}

            {/* Contacts list */}
            {loading ? (
                <div className="text-center py-8 text-slate-400">Ładuję kontakty...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-slate-500 font-medium">Brak kontaktów{filter !== 'all' ? ` o statusie "${STATUS_CONFIG[filter]?.label}"` : ''}</p>
                    <p className="text-xs text-slate-400 mt-1">Kontakty pojawiają się z kampanii FB Lead Ads lub dodaj ręcznie</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(c => {
                        const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.new;
                        return (
                            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-800 text-sm">{c.full_name || '(bez imienia)'}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                                            {c.quality_score > 0 && <span className="text-[10px] text-slate-400">⭐ {c.quality_score}/100</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                            {c.phone && <span>📞 {c.phone}</span>}
                                            {c.email && <span>📧 {c.email}</span>}
                                            {c.city && <span>📍 {c.city}</span>}
                                            {c.campaign_name && <span>🎯 {c.campaign_name}</span>}
                                            <span className="text-slate-400">{new Date(c.created_at).toLocaleDateString('de-DE')}</span>
                                        </div>
                                        {c.notes && <p className="text-xs text-slate-500 mt-1 italic">💬 {c.notes}</p>}
                                        {c.ai_analysis && (
                                            <details className="mt-2">
                                                <summary className="text-[10px] text-violet-600 cursor-pointer font-bold">🤖 Analiza AI</summary>
                                                <div className="mt-1 p-2 bg-violet-50 rounded-lg text-xs text-violet-800 whitespace-pre-wrap">{c.ai_analysis.substring(0, 500)}</div>
                                            </details>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 ml-3">
                                        <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                                            className="px-2 py-1 rounded border border-slate-200 text-[10px] bg-white">
                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                                        </select>
                                        <button onClick={() => handleSendSMS(c)} disabled={!!sendingAction || !c.phone}
                                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium hover:bg-green-200 disabled:opacity-50">
                                            {sendingAction === `sms-${c.id}` ? '⏳' : '📱'} SMS {c.sms_sent ? `(${c.sms_sent})` : ''}
                                        </button>
                                        <button onClick={() => handleSendEmail(c)} disabled={!!sendingAction || !c.email}
                                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-medium hover:bg-blue-200 disabled:opacity-50">
                                            {sendingAction === `email-${c.id}` ? '⏳' : '📧'} Email {c.emails_sent ? `(${c.emails_sent})` : ''}
                                        </button>
                                        <button onClick={() => handleAIAnalyze(c)} disabled={analyzing === c.id}
                                            className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-[10px] font-medium hover:bg-violet-200 disabled:opacity-50">
                                            {analyzing === c.id ? '⏳' : '🤖'} AI
                                        </button>
                                        {c.status !== 'converted' ? (
                                            <button onClick={() => handleMoveToLeads(c)} disabled={!!sendingAction}
                                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-50">
                                                {sendingAction === `lead-${c.id}` ? '⏳' : '🎯'} → Lead
                                            </button>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] text-center">✅ Lead</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
