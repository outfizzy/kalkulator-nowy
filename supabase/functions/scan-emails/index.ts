
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IMPROVED System Prompt for AI (Polish Enforcement & HTML Cleaning)
const SYSTEM_PROMPT = `
You are an AI Sales Assistant for a Polish company (Polendach). Your job is to classify incoming emails into specific categories and extract structured data.

LANGUAGE REQUIREMENT:
- All summaries, notes, and descriptions MUST be in POLISH language.
- Even if the email is in German, translate the summary to Polish.

CATEGORIES:
1. "lead": A NEW sales inquiry, request for offer, or potential client interested in products/services (Terrace roofs, Carports, Winter gardens).
2. "service": A generic customer service request, complaint, report of damage/defect to existing installation.
3. "spam": Newsletters, automated notifications, internal system emails, or obvious junk.
4. "reply": An ongoing conversation (RE: in subject), payment confirmation, or simple follow-up that is NOT a new inquiry.

OUTPUT FORMAT (JSON ONLY):
{
  "type": "lead" | "service" | "spam" | "reply",
  "confidence": number, // 0.0 to 1.0
  "summary": "Short summary in POLISH (max 200 chars). E.g., 'Zapytanie o wycenę zadaszenia 4x3m z montażem w Berlinie'.",
  "cleaned_content": "The full original message content, but CLEANED of HTML tags (like <p>, <div>, <li>), system footers, and legal disclaimers. Keep it readable with newlines. Translate key technical requests to Polish if needed, but keep original German text if it's crucial for context.",
  "leadData": {
    "firstName": string | null,
    "lastName": string | null,
    "companyName": string | null,
    "phone": string | null,
    "email": string | null,
    "street": string | null, // Street + House Number
    "postalCode": string | null, // PLZ (CRITICAL)
    "city": string | null // City (CRITICAL)
  },
  "serviceData": {
    "issueDescription": string, // In Polish
    "priority": "low" | "medium" | "high"
  }
}

EXTRACTION RULES (CRITICAL):
- **POSTAL CODE (PLZ) & CITY**: You MUST aggressively search for a 5-digit German Postal Code (PLZ) and City Name in the email body, especially in the SIGNATURE or FOOTER. If found, extract them to "postalCode" and "city".
- **ADDRESS**: If a street address is found, extract it to "street".
- If the email is a direct reply (Subject starts with "Re:" or "AW:") and doesn't look like a NEW project inquiry, classify as "reply".
- "cleaned_content" should look like a clean text message, ready for a sales rep to read without technical clutter.
`;

/**
 * Minimal IMAP Client for Deno
 * Implements LOGIN, SELECT, SEARCH, FETCH, STORE +FLAGS, LOGOUT
 */
class SimpleIMAP {
    private conn: Deno.TlsConn | null = null;
    private tagCount: number = 0;

    constructor(private config: any) { }

    async connect() {
        this.conn = await Deno.connectTls({
            hostname: this.config.host,
            port: this.config.port || 993,
        });
        await this.readUntil("* OK");
    }

    async login() {
        return this.sendCommand(`LOGIN "${this.config.user}" "${this.config.password}"`);
    }

    async select(mailbox: string = 'INBOX') {
        return this.sendCommand(`SELECT ${mailbox}`);
    }

    async searchEmails(criteria: string) {
        const response = await this.sendCommand(`SEARCH ${criteria}`);
        const lines = response.split('\r\n');
        const searchLine = lines.find(l => l.startsWith('* SEARCH'));
        if (!searchLine) return [];
        return searchLine.split(' ').slice(2).filter(x => x.trim().length > 0).map(Number);
    }

    // Fetches Header + Body Text
    async fetchEmail(id: number) {
        // BODY.PEEK[] fetches the entire email (Header + Body) without marking as read
        const cmd = `FETCH ${id} (BODY.PEEK[])`;
        return this.execFetch(cmd);
    }

    async fetchEmailByUid(uid: number) {
        const cmd = `UID FETCH ${uid} (BODY.PEEK[])`;
        return this.execFetch(cmd);
    }

    private async execFetch(cmd: string) {
        if (!this.conn) throw new Error("No connection");
        const tag = `A${this.tagCount++}`;
        const encoder = new TextEncoder();
        await this.conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
        return this.readUntil(`${tag} OK`);
    }

    async markSeen(id: number) {
        return this.sendCommand(`STORE ${id} +FLAGS (\\Seen)`);
    }

    async logout() {
        if (this.conn) {
            try {
                await this.sendCommand(`LOGOUT`);
                this.conn.close();
            } catch (e) { }
        }
    }

    private async sendCommand(cmd: string) {
        if (!this.conn) throw new Error("Not connected");
        const tag = `A${this.tagCount++}`;
        const encoder = new TextEncoder();
        await this.conn.write(encoder.encode(`${tag} ${cmd}\r\n`));
        return this.readUntil(`${tag} OK`);
    }

    private async readUntil(terminator: string): Promise<string> {
        if (!this.conn) return "";
        const decoder = new TextDecoder();
        let accumulated = "";
        let buf = new Uint8Array(4096); // Increased buffer

        while (true) {
            const n = await this.conn.read(buf);
            if (n === null) break;
            const chunk = decoder.decode(buf.subarray(0, n));
            accumulated += chunk;
            if (accumulated.includes(terminator)) break;
            if (accumulated.includes(`A${this.tagCount - 1} NO`) || accumulated.includes(`A${this.tagCount - 1} BAD`)) {
                throw new Error("IMAP Error: " + accumulated);
            }
        }
        return accumulated;
    }
}

function getImapDateStr(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

// --------------------------------------------------------------------------------
//  ROBUST PARSER with MIME Decoding
// --------------------------------------------------------------------------------

function decodeMimeEncodedWord(str: string): string {
    return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
        try {
            const buffer = encoding.toLowerCase() === 'b'
                ? Uint8Array.from(atob(text), c => c.charCodeAt(0))
                : Uint8Array.from(decodeQuotedPrintable(text), c => c.charCodeAt(0));

            const decoder = new TextDecoder(charset);
            return decoder.decode(buffer);
        } catch (e) {
            return text; // Fallback
        }
    });
}

function decodeQuotedPrintable(str: string): string {
    return str.replace(/=([a-fA-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/_/g, ' ');
}

function parseEmailRobust(raw: string) {
    const headerEnd = raw.indexOf("\r\n\r\n");
    const headerBlock = raw.substring(0, headerEnd);
    let bodyBlock = raw.substring(headerEnd);

    const subjectMatch = headerBlock.match(/^Subject:\s*(.*)$/im);
    let subject = subjectMatch ? subjectMatch[1].trim() : "No Subject";
    subject = decodeMimeEncodedWord(subject);

    const fromMatch = headerBlock.match(/^From:\s*(.*)$/im);
    const fromLine = fromMatch ? fromMatch[1].trim() : "";
    let senderName = "Unknown";
    let senderEmail = "";

    if (fromLine.includes("<")) {
        const parts = fromLine.split("<");
        senderName = parts[0].replaceAll('"', '').trim();
        senderName = decodeMimeEncodedWord(senderName);
        senderEmail = parts[1].replace(">", "").trim();
    } else {
        senderEmail = fromLine;
        senderName = fromLine.split("@")[0];
    }

    // Extract Message-ID for Deduplication
    const msgIdMatch = headerBlock.match(/^Message-ID:\s*<(.*?)>/im);
    const messageId = msgIdMatch ? msgIdMatch[1].trim() : null;

    // Decode Quoted-Printable Body (Naive but functional for now)
    let text = bodyBlock.replaceAll("=3D", "=").replaceAll("=\r\n", "");

    return { subject, senderName, senderEmail, text, messageId };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { batchSize = 10, days = 0, offset = 0, userEmail, targetIds, config: providedConfig } = await req.json().catch(() => ({}));
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const openAiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAiKey) throw new Error("Missing OPENAI_API_KEY");

        const allEmailRefs: { profile: any; id: number; config?: any }[] = [];

        if (providedConfig && providedConfig.imapHost) {
            // DIRECT MODE (e.g. Shared Inbox or matched Frontend Config)
            console.log("Using provided config from request body");
            const virtualProfile = {
                id: 'direct',
                email: providedConfig.imapUser || providedConfig.smtpUser || 'direct-access',
                email_config: providedConfig
            };

            try {
                const config = providedConfig;
                if (targetIds && targetIds.length > 0) {
                    // MANUAL MODE
                    const refs = targetIds.map((id: number) => ({ profile: virtualProfile, id, config }));
                    allEmailRefs.push(...refs);
                } else {
                    // AUTO MODE (Search)
                    const client = new SimpleIMAP({
                        host: config.imapHost,
                        port: config.imapPort || 993,
                        user: config.imapUser || config.smtpUser,
                        password: config.imapPassword || config.smtpPassword
                    });

                    await client.connect();
                    await client.login();
                    await client.select('INBOX');

                    let searchCriteria = 'UNSEEN';
                    if (days > 0) searchCriteria = `SINCE ${getImapDateStr(days)}`;

                    const ids = await client.searchEmails(searchCriteria);
                    const refs = ids.map((id: number) => ({ profile: virtualProfile, id, config }));
                    allEmailRefs.push(...refs);
                    await client.logout();
                }
            } catch (err: any) {
                console.error("Error in Direct Config scan:", err);
            }

        } else {
            // DB PROFILE LOOKUP MODE
            let query = supabaseAdmin
                .from('profiles')
                .select('id, email, email_config')
                .not('email_config', 'is', null);

            if (userEmail) {
                query = query.eq('email', userEmail);
            }

            const { data: profiles, error: profileError } = await query;
            if (profileError) throw profileError;

            // 1. COLLECT IDs from all matching profiles
            for (const profile of profiles || []) {
                try {
                    const config = profile.email_config;
                    if (!config?.imapHost) continue;

                    if (targetIds && targetIds.length > 0) {
                        const refs = targetIds.map((id: number) => ({ profile, id, config }));
                        allEmailRefs.push(...refs);
                    } else {
                        const client = new SimpleIMAP({
                            host: config.imapHost,
                            port: config.imapPort || 993,
                            user: config.imapUser || config.smtpUser || profile.email,
                            password: config.imapPassword || config.smtpPassword
                        });

                        await client.connect();
                        await client.login();
                        await client.select('INBOX');

                        let searchCriteria = 'UNSEEN';
                        if (days > 0) searchCriteria = `SINCE ${getImapDateStr(days)}`;

                        const ids = await client.searchEmails(searchCriteria);
                        const refs = ids.map((id: number) => ({ profile, id, config }));
                        allEmailRefs.push(...refs);

                        await client.logout();
                    }

                } catch (err) {
                    console.error(`Error searching profile ${profile.email}:`, err);
                }
            }
        }

        // 2. PAGINATION (Global)
        const totalFound = allEmailRefs.length;

        // If Manual Mode (targetIds), we ignore offset usually, unless explicitly passed for batching manual list??
        // Assuming manual list is small (<50), we can just process all if offset=0.
        // But let's respect offset and batchSize just in case frontend slices it.

        const safeOffset = Math.min(offset, totalFound);
        // Ensure we don't slice out of bounds or negatively
        const batchRefs = allEmailRefs.slice(safeOffset, Math.min(safeOffset + batchSize, totalFound));
        const remaining = Math.max(0, totalFound - (safeOffset + batchSize));

        console.log(`Global Scan: Found ${totalFound}, Offset ${safeOffset}, Batch Size ${batchSize}, Actual Batch ${batchRefs.length}, Remaining ${remaining}`);

        const results = [];
        const activeConnections: Record<string, SimpleIMAP> = {};

        // 3. PROCESS BATCH
        for (const ref of batchRefs) {
            const { profile, id, config: refConfig } = ref;
            const profileKey = profile.email; // Identify unique connection needed

            let client = activeConnections[profileKey];

            try {
                if (!client) {
                    const config = refConfig || profile.email_config;
                    client = new SimpleIMAP({
                        host: config.imapHost,
                        port: config.imapPort || 993,
                        user: config.imapUser || config.smtpUser || profile.email,
                        password: config.imapPassword || config.smtpPassword
                    });
                    await client.connect();
                    await client.login();
                    await client.select('INBOX');
                    activeConnections[profileKey] = client;
                }

                let raw;
                if (targetIds) {
                    // Manual Mode: IDs are UIDs
                    raw = await client.fetchEmailByUid(id);
                } else {
                    // Auto Mode: IDs are SeqNos (from SEARCH)
                    raw = await client.fetchEmail(id);
                }
                const { subject, senderName, senderEmail, text, messageId } = parseEmailRobust(raw);

                // DEDUPLICATION
                let isDuplicate = false;
                let uniqueId = messageId || `LEGACY-IMAP-${subject}-${senderEmail}`;

                const { data: existingLead } = await supabaseAdmin
                    .from('leads')
                    .select('id')
                    .eq('email_message_id', uniqueId)
                    .maybeSingle();

                if (existingLead) isDuplicate = true;

                if (isDuplicate) {
                    // In Manual Mode, user might WANT to re-analyze?
                    // But usually we respect Deduplication.
                    // Let's Log it.
                    console.log(`Skipping duplicate: ${subject}`);
                    results.push({ status: 'skipped_duplicate', subject });
                    if (days === 0 && !targetIds) await client.markSeen(id); // Only mark seen if auto-mode
                    continue;
                }

                // AI ANALYSIS
                const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openAiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: `Subject: ${subject}\nFrom: ${senderName} <${senderEmail}>\n\nBody:\n${text.substring(0, 3000)}` }
                        ],
                        response_format: { type: "json_object" }
                    }),
                });

                const aiJson = await aiResponse.json();
                const analysis = JSON.parse(aiJson.choices?.[0]?.message?.content || '{}');

                // ACTION
                if (analysis.type === 'lead') {
                    const leadData = analysis.leadData || {};
                    if (!leadData.email) leadData.email = senderEmail;
                    if (!leadData.lastName) leadData.lastName = senderName;

                    const isShared = profile.email.toLowerCase().includes('buero') || profile.email.toLowerCase().includes('kontakt');
                    const assignedTo = isShared ? null : profile.id;

                    const { error } = await supabaseAdmin.from('leads').insert({
                        status: 'new',
                        source: 'email',
                        customer_data: leadData,
                        notes: `[AI Import] Źródło: Email "${subject}"\nPodsumowanie: ${analysis.summary}\n\n--- Treść wiadomości ---\n${analysis.cleaned_content || text}`,
                        email_message_id: uniqueId,
                        assigned_to: assignedTo
                    });

                    if (!error) {
                        if (!targetIds) await client.markSeen(id); // Only mark seen if auto-mode
                        results.push({ status: 'created_lead', subject });

                        // ═══ AUTO FOLLOW-UP EMAIL (DE) ═══
                        const clientEmail = leadData.email;
                        if (clientEmail && clientEmail.includes('@')) {
                            try {
                                const smtpHost = Deno.env.get('SMTP_HOST');
                                const smtpUser = Deno.env.get('SMTP_USER');
                                const smtpPass = Deno.env.get('SMTP_PASS');

                                if (smtpHost && smtpUser && smtpPass) {
                                    const nodemailer = (await import("npm:nodemailer@6.9.13")).default;
                                    const transporter = nodemailer.createTransport({
                                        host: smtpHost, port: 465, secure: true,
                                        auth: { user: smtpUser, pass: smtpPass },
                                        tls: { rejectUnauthorized: false },
                                    });

                                    const clientName = leadData.firstName || leadData.lastName || 'Kunde';
                                    const followUpHtml = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Polendach24</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Premium Terrassenüberdachungen</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Vielen Dank für Ihre Anfrage, ${clientName}!</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;font-size:15px;">
        Wir haben Ihre Anfrage erhalten und an unseren zuständigen Berater weitergeleitet.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#166534;margin:0;font-size:14px;font-weight:600;">✅ Wie geht es weiter?</p>
        <p style="color:#166534;margin:8px 0 0;font-size:14px;line-height:1.6;">
          Unser Berater wird sich <strong>innerhalb von 24 Stunden</strong> bei Ihnen melden, um die Details zu besprechen und ein unverbindliches Angebot zu erstellen.
        </p>
      </div>
      <p style="color:#475569;line-height:1.7;margin:24px 0 16px;font-size:15px;">
        In der Zwischenzeit laden wir Sie ein, unsere Produkte auf 
        <a href="https://polendach24.de" style="color:#2563eb;text-decoration:none;font-weight:600;">polendach24.de</a> zu entdecken.
      </p>
      <p style="color:#475569;line-height:1.7;margin:0;font-size:15px;">
        Bei weiteren Fragen antworten Sie einfach auf diese E-Mail — wir helfen Ihnen gerne!
      </p>
    </div>
    <div style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;margin:0;font-size:13px;line-height:1.6;">
        Mit freundlichen Grüßen,<br>
        <strong style="color:#334155;">Ihr Polendach24 Team</strong><br>
        Polendach24 GmbH<br>
        <a href="mailto:${smtpUser}" style="color:#2563eb;text-decoration:none;">${smtpUser}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
                                    await transporter.sendMail({
                                        from: `Polendach24 <${smtpUser}>`,
                                        to: clientEmail,
                                        subject: `Vielen Dank für Ihre Anfrage — ${clientName}! | Polendach24`,
                                        html: followUpHtml,
                                    });
                                    console.log(`[scan-emails] ✅ Auto follow-up (DE) sent to ${clientEmail}`);
                                }
                            } catch (emailErr) {
                                console.error("[scan-emails] Follow-up email error:", emailErr);
                            }
                        }
                    } else {
                        results.push({ status: 'error_db', subject, error: error.message });
                    }
                } else if (analysis.type === 'service') {
                    const { error } = await supabaseAdmin.from('service_tickets').insert({
                        ticket_number: `SRV-${Date.now().toString().slice(-6)}`,
                        type: 'other',
                        status: 'new',
                        priority: analysis.serviceData?.priority || 'medium',
                        description: analysis.serviceData?.issueDescription || analysis.summary,
                        created_at: new Date().toISOString()
                    });
                    if (!error) {
                        if (!targetIds) await client.markSeen(id);
                        results.push({ status: 'created_ticket', subject });
                    }
                } else {
                    console.log(`Skipped (Type: ${analysis.type}): ${subject}`);
                    // If manual, we don't mark as seen.
                    if (analysis.type === 'spam' && !targetIds) {
                        await client.markSeen(id);
                    }
                    results.push({ status: `skipped_${analysis.type}`, subject });
                }

            } catch (err: any) {
                console.error(`Error processing email ${id} for ${profile.email}:`, err);
                results.push({ status: 'error', subject: `ID ${id}`, message: err.message });
            }
        }

        // Cleanup connections
        for (const client of Object.values(activeConnections)) {
            try { await client.logout(); } catch (e) { }
        }

        return new Response(JSON.stringify({
            success: true,
            processedCount: results.length,
            remaining,
            results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
