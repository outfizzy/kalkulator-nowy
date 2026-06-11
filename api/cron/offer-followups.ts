import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// AUTO-FOLLOW-UPY ofert agenta — uruchamiane raz dziennie (Vercel Cron).
//
// ZASADY (ustalone z właścicielem):
//  - Globalny wyłącznik: app_settings['offer_followups'].enabled — można
//    wyłączyć w każdej chwili w CRM (dashboard lejka). Start = WYŁĄCZONE.
//  - Pauza per lead: leads.followups_paused (przycisk przy leadzie).
//  - STOP automatyczny, gdy klient się odezwał LUB sprawa ruszyła:
//      • status leada ≠ offer_agent_sent/offer_sent (ktoś już działa),
//      • przychodzący mail / wiadomość z oferty / SMS / JAKIKOLWIEK telefon
//        po wysłaniu oferty,
//      • interakcja measurement_request lub offer_accept na ofercie.
//  - Max 1 follow-up na ofertę na dobę; przy zaległościach wysyłamy tylko
//    NAJPÓŹNIEJSZY należny etap (bez nadrabiania trzech maili naraz).
//  - dryRun=1 → pełna decyzja bez wysyłki (do kontroli przed włączeniem).
//
// Etapy (wiek oferty): 3 dni → S1 „Haben Sie Fragen?", 10 dni → S2
// „Richtpreise garantiert bis…", 23 dni → S3 „läuft ab" (email + SMS).
// Dodatkowo: wewnętrzny alert „gorący lead" (koszyk bez pomiaru) dla
// przypisanego handlowca — nie dotyka klienta.
// ============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const APP_URL = 'https://polendach24.app';
const COMPANY_PHONE_DISPLAY = '0152 5748 7430';
const COMPANY_PHONE_HREF = '+4915257487430';

const ACTIVE_LEAD_STATUSES = ['offer_agent_sent', 'offer_sent'];
const STAGES = [
    { key: 'stage3', minAgeDays: 23 },
    { key: 'stage2', minAgeDays: 10 },
    { key: 'stage1', minAgeDays: 3 },
] as const;

type StageKey = typeof STAGES[number]['key'];

// ── Szablony (DE) ──────────────────────────────────────────────────────────
function emailShell(inner: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td style="background:#f4f6f8;padding:20px 40px;text-align:center;border-bottom:2px solid #e2e8f0;">
<img src="${APP_URL}/PolenDach24-Logo.png" alt="Polendach24" width="160" style="max-width:160px;height:auto;" /></td></tr>
${inner}
<tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:11px;line-height:1.6;margin:0;">Polendach24 &middot; Terrassen&uuml;berdachungen aus Aluminium &middot; Tel. ${COMPANY_PHONE_DISPLAY}<br/>
Sie m&ouml;chten keine Erinnerungen mehr erhalten? Antworten Sie kurz auf diese E-Mail &#8212; wir stellen sie sofort ein.</p></td></tr>
</table></td></tr></table></body></html>`;
}

function ctaButton(url: string, label: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 4px;">
<a href="${url}" style="background-color:#1e40af;color:#ffffff;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">${label}</a></td></tr></table>`;
}

function buildEmail(stage: StageKey, p: { name: string; offerNumber: string; url: string; validUntil: string; priceFrom?: string }): { subject: string; html: string } {
    const greet = `<p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0 0 16px;">Guten Tag${p.name ? ` ${p.name}` : ''},</p>`;
    if (stage === 'stage1') {
        return {
            subject: `Haben Sie Fragen zu Ihrem Angebot ${p.offerNumber}?`,
            html: emailShell(`<tr><td style="padding:32px 40px;">
${greet}
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">vor einigen Tagen haben wir Ihnen Ihre pers&ouml;nliche Planung mit Richtpreisen geschickt. Gerne beantworten wir alle Fragen &#8212; zu Ma&szlig;en, Farben, Extras oder zur Montage.</p>
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Tipp: In Ihrem Angebot k&ouml;nnen Sie Extras per Klick zu Ihrer Wunschkonfiguration hinzuf&uuml;gen und direkt online einen <strong>kostenlosen Aufma&szlig;termin</strong> anfragen &#8212; unverbindlich.</p>
${ctaButton(p.url, 'Mein Angebot &ouml;ffnen &#8594;')}
<p style="text-align:center;color:#64748b;font-size:12px;margin:8px 0 0;">Oder rufen Sie uns an: ${COMPANY_PHONE_DISPLAY}</p>
</td></tr>`),
        };
    }
    if (stage === 'stage2') {
        return {
            subject: `Ihre Richtpreise sind noch bis ${p.validUntil} garantiert`,
            html: emailShell(`<tr><td style="padding:32px 40px;">
${greet}
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">eine kurze Erinnerung: Die Richtpreise in Ihrem Angebot <strong>${p.offerNumber}</strong>${p.priceFrom ? ` (ab ${p.priceFrom})` : ''} sind noch bis zum <strong>${p.validUntil}</strong> garantiert.</p>
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Der n&auml;chste Schritt ist ganz einfach: ein <strong>kostenloses, unverbindliches Aufma&szlig;</strong> bei Ihnen vor Ort (ca. 30&#8211;45 Minuten). Dabei kl&auml;ren wir alle Details und Sie erhalten Ihren verbindlichen Festpreis.</p>
${ctaButton(p.url, 'Kostenloses Aufma&szlig; anfragen &#8594;')}
<p style="text-align:center;color:#64748b;font-size:12px;margin:8px 0 0;">Direkt im Angebot &#8212; zwei Klicks, fertig.</p>
</td></tr>`),
        };
    }
    return {
        subject: `Ihr Angebot ${p.offerNumber} läuft am ${p.validUntil} ab`,
        html: emailShell(`<tr><td style="padding:32px 40px;">
${greet}
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">Ihr pers&ouml;nliches Angebot <strong>${p.offerNumber}</strong> l&auml;uft am <strong>${p.validUntil}</strong> ab. Danach m&uuml;ssen wir neu kalkulieren, da sich die Einkaufspreise unserer Hersteller regelm&auml;&szlig;ig &auml;ndern.</p>
<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 20px;">Wenn Sie das Projekt noch in dieser Saison umsetzen m&ouml;chten, sichern Sie sich jetzt Ihren <strong>kostenlosen Aufma&szlig;termin</strong> &#8212; unverbindlich und ohne Wartezeit.</p>
${ctaButton(p.url, 'Termin sichern &#8594;')}
<p style="text-align:center;color:#64748b;font-size:12px;margin:8px 0 0;">Fragen? ${COMPANY_PHONE_DISPLAY} &#8212; wir sind gerne f&uuml;r Sie da.</p>
</td></tr>`),
    };
}

function buildSms(p: { offerNumber: string; url: string; validUntil: string }): string {
    return `Polendach24: Ihr Angebot ${p.offerNumber} läuft am ${p.validUntil} ab. Details & kostenloser Aufmaßtermin: ${p.url}`;
}

// ── Pomocnicze ─────────────────────────────────────────────────────────────
async function clientRespondedSince(db: SupabaseClient, leadId: string | null, offerId: string, sinceIso: string): Promise<string | null> {
    if (leadId) {
        const [comm, sms, calls] = await Promise.all([
            db.from('customer_communications').select('id').eq('lead_id', leadId).in('direction', ['inbound', 'incoming']).gte('date', sinceIso).limit(1),
            db.from('sms_logs').select('id').eq('lead_id', leadId).eq('direction', 'inbound').gte('created_at', sinceIso).limit(1),
            db.from('call_logs').select('id').eq('lead_id', leadId).gte('created_at', sinceIso).limit(1),
        ]);
        if (comm.data?.length) return 'klient odpisał mailem';
        if (sms.data?.length) return 'klient odpisał SMS-em';
        if (calls.data?.length) return 'była rozmowa telefoniczna';
    }
    const msgs = await db.from('lead_messages').select('id, sender_type').eq('offer_id', offerId).gte('created_at', sinceIso).limit(10);
    if ((msgs.data || []).some(m => !['user', 'agent', 'system'].includes(String(m.sender_type)))) return 'klient napisał w ofercie';
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!supabaseServiceKey) return res.status(500).json({ error: 'Missing Service Role Key' });
    const db = createClient(supabaseUrl, supabaseServiceKey);
    const dryRun = req.query.dryRun === '1' || req.query.dryrun === '1';

    // 0. Globalny wyłącznik
    const { data: settingRow } = await db.from('app_settings').select('value').eq('key', 'offer_followups').maybeSingle();
    const enabled = settingRow?.value?.enabled === true;

    const sent: any[] = [];
    const skipped: any[] = [];
    const alerts: any[] = [];

    // 1. Kandydaci: oferty agenta, wysłane, ≤30 dni
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: offers, error } = await db
        .from('offers')
        .select('id, offer_number, public_token, created_at, customer_data, lead_id, user_id, customer_id, status')
        .eq('status', 'sent')
        .contains('product_config', { agentGenerated: true })
        .gte('created_at', cutoff)
        .not('public_token', 'is', null)
        .limit(200);
    if (error) return res.status(500).json({ error: error.message });

    const leadIds = [...new Set((offers || []).map(o => o.lead_id).filter(Boolean))];
    const { data: leads } = leadIds.length
        ? await db.from('leads').select('id, status, followups_paused, user_id').in('id', leadIds)
        : { data: [] as any[] };
    const leadById = new Map((leads || []).map(l => [l.id, l]));

    // dryRun pokazuje decyzje nawet przy wyłączonym przełączniku (kontrola przed startem);
    // realna wysyłka wymaga enabled && !dryRun.
    if (enabled || dryRun) for (const offer of offers || []) {
        const ageDays = Math.floor((Date.now() - new Date(offer.created_at).getTime()) / (24 * 3600 * 1000));
        const stageDef = STAGES.find(s => ageDays >= s.minAgeDays);
        if (!stageDef) { continue; }
        const stage = stageDef.key;
        const lead = offer.lead_id ? leadById.get(offer.lead_id) : null;
        const reasonBase = { offer: offer.offer_number, stage, ageDays };

        // ── Warunki stopu ──
        if (lead?.followups_paused) { skipped.push({ ...reasonBase, reason: 'pauza ręczna na leadzie' }); continue; }
        if (lead && !ACTIVE_LEAD_STATUSES.includes(lead.status)) { skipped.push({ ...reasonBase, reason: `status leada: ${lead.status}` }); continue; }

        // już wysłane (ten lub późniejszy etap)?
        const { data: prior } = await db.from('offer_followups').select('stage, sent_at').eq('offer_id', offer.id);
        const stageRank: Record<string, number> = { stage1: 1, stage2: 2, stage3: 3 };
        const maxPrior = Math.max(0, ...(prior || []).filter(f => stageRank[f.stage]).map(f => stageRank[f.stage]));
        if (maxPrior >= stageRank[stage]) { continue; }
        // max 1 follow-up / 20h na ofertę (zaległości rozkładają się na dni)
        const lastSent = Math.max(0, ...(prior || []).map(f => new Date(f.sent_at).getTime()));
        if (lastSent && Date.now() - lastSent < 20 * 3600 * 1000) { skipped.push({ ...reasonBase, reason: 'follow-up wysłany <20h temu' }); continue; }

        // klient zareagował na ofertę?
        const { data: actions } = await db.from('offer_interactions').select('id').eq('offer_id', offer.id).in('event_type', ['measurement_request', 'offer_accept']).limit(1);
        if (actions?.length) { skipped.push({ ...reasonBase, reason: 'klient poprosił o pomiar / zaakceptował' }); continue; }

        // klient się odezwał (mail/SMS/telefon/wiadomość)?
        const responded = await clientRespondedSince(db, offer.lead_id, offer.id, offer.created_at);
        if (responded) { skipped.push({ ...reasonBase, reason: responded }); continue; }

        const cd = offer.customer_data || {};
        const email = cd.email || cd.Email || null;
        if (!email) { skipped.push({ ...reasonBase, reason: 'brak adresu e-mail' }); continue; }

        const name = [cd.firstName || cd.first_name, cd.lastName || cd.last_name].filter(Boolean).join(' ').trim();
        const url = `${APP_URL}/p/offer/${offer.public_token}`;
        const validUntil = new Date(new Date(offer.created_at).getTime() + 30 * 24 * 3600 * 1000)
            .toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const { subject, html } = buildEmail(stage, { name, offerNumber: offer.offer_number, url, validUntil });

        if (dryRun) { sent.push({ ...reasonBase, to: email, subject, dryRun: true }); continue; }

        // ── Wysyłka e-mail ──
        try {
            const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}`, 'apikey': supabaseServiceKey },
                body: JSON.stringify({ to: email, subject, html, fromName: 'Polendach24' }),
            });
            if (!resp.ok) throw new Error(`send-email HTTP ${resp.status}`);
        } catch (e) {
            skipped.push({ ...reasonBase, reason: `błąd wysyłki: ${(e as Error).message}` });
            continue;
        }

        await db.from('offer_followups').insert({ offer_id: offer.id, lead_id: offer.lead_id, stage, channel: 'email', meta: { to: email, subject } });
        await db.from('customer_communications').insert({
            lead_id: offer.lead_id, customer_id: offer.customer_id || null, user_id: offer.user_id || lead?.user_id || null,
            type: 'email', direction: 'outbound', subject,
            content: `[Auto-Follow-up ${stage}] ${subject}`, date: new Date().toISOString(),
            metadata: { followup_stage: stage, offer_id: offer.id, offer_number: offer.offer_number },
        }).then(({ error: e }) => { if (e) console.error('comm log error:', e.message); });
        sent.push({ ...reasonBase, to: email, channel: 'email' });

        // ── Etap 3: dodatkowo SMS ──
        const phone = cd.phone || cd.telefon || cd.phoneNumber || null;
        if (stage === 'stage3' && phone) {
            try {
                const smsResp = await fetch(`${supabaseUrl}/functions/v1/twilio-sms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
                    body: JSON.stringify({ to: phone, body: buildSms({ offerNumber: offer.offer_number, url, validUntil }), leadId: offer.lead_id }),
                });
                if (smsResp.ok) {
                    await db.from('offer_followups').insert({ offer_id: offer.id, lead_id: offer.lead_id, stage, channel: 'sms', meta: { to: phone } });
                    sent.push({ ...reasonBase, to: phone, channel: 'sms' });
                }
            } catch { /* SMS best-effort */ }
        }
    }

    // 2. Wewnętrzny alert „gorący lead": konfigurował koszyk, nie poprosił o pomiar
    //    (działa niezależnie od wyłącznika — nie dotyka klienta, tylko CRM).
    const hotCutoff = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data: hotEvents } = await db
        .from('offer_interactions')
        .select('offer_id, event_type, event_data, created_at')
        .in('event_type', ['cart_extra_added', 'tier_selected'])
        .gte('created_at', hotCutoff);
    const hotOfferIds = [...new Set((hotEvents || []).map(h => h.offer_id).filter(Boolean))];
    for (const offerId of hotOfferIds) {
        const offer = (offers || []).find(o => o.id === offerId);
        if (!offer) continue;
        const { data: conv } = await db.from('offer_interactions').select('id').eq('offer_id', offerId).in('event_type', ['measurement_request', 'offer_accept']).limit(1);
        if (conv?.length) continue;
        const { data: alreadyAlerted } = await db.from('offer_followups').select('id').eq('offer_id', offerId).eq('stage', 'hot_lead_alert').gte('sent_at', new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()).limit(1);
        if (alreadyAlerted?.length) continue;
        const targetUser = offer.user_id || (offer.lead_id ? leadById.get(offer.lead_id)?.user_id : null);
        if (!targetUser) continue;
        const cd = offer.customer_data || {};
        const clientName = [cd.firstName || cd.first_name, cd.lastName || cd.last_name].filter(Boolean).join(' ') || 'Klient';
        if (!dryRun) {
            await db.from('notifications').insert({
                user_id: targetUser, type: 'info',
                title: '🔥 Gorący lead — konfigurował ofertę',
                message: `${clientName} wybierał pakiet/extras w ofercie ${offer.offer_number}, ale nie poprosił o pomiar. Warto zadzwonić.`,
                link: offer.lead_id ? `/leads/${offer.lead_id}` : undefined,
                metadata: { offer_id: offerId, offer_number: offer.offer_number },
            });
            await db.from('offer_followups').insert({ offer_id: offerId, lead_id: offer.lead_id, stage: 'hot_lead_alert', channel: 'internal', meta: { user_id: targetUser } });
        }
        alerts.push({ offer: offer.offer_number, user: targetUser, dryRun });
    }

    return res.status(200).json({
        enabled, dryRun,
        candidates: (offers || []).length,
        sent, skipped: skipped.slice(0, 60), hotLeadAlerts: alerts,
    });
}
