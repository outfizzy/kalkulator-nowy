import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import imaps from "npm:imap-simple@5.1.0";
import { simpleParser } from "npm:mailparser@3.6.4";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System Prompt for AI
const SYSTEM_PROMPT = `
You are an AI Sales & Service Assistant. Analyze incoming emails to classify them as "lead" (sales inquiry), "service" (complaint, repair, warranty issue), or "spam" (newsletter, internal, automated).

Input: Email Subject and Body.
Output: JSON ONLY.
Structure:
{
  "type": "lead" | "service" | "spam",
  "confidence": number, // 0-1
  // If type is "lead":
  "leadData": {
    "firstName": string | null,
    "lastName": string | null, // try to extract from signature or "From" field
    "companyName": string | null,
    "phone": string | null,
    "email": string | null, // extract from body or return null if same as sender
    "city": string | null, 
    "postalCode": string | null,
    "address": string | null
  },
  // If type is "service":
  "serviceData": {
    "contractNumber": string | null, // Look for patterns like "ZK/2024/...", "UM/...", numbers
    "issueDescription": string,
    "priority": "low" | "medium" | "high" // Infer from urgency tone
  },
  "summary": "Short summary of the request"
}
Ignore no-reply, newsletters, and spam.
`;

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Initialize Supabase Admin Client (Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const openAiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAiKey) throw new Error("Missing OPENAI_API_KEY");

        // 2. Fetch Users with active Email Config
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, email_config, full_name')
            .not('email_config', 'is', null);

        if (profileError) throw profileError;

        const results = [];

        // 3. Loop through users
        for (const profile of profiles || []) {
            try {
                const config = profile.email_config;

                // Skip if config is incomplete
                if (!config?.imapHost || !config?.imapPassword) {
                    console.log(`Skipping user ${profile.email}: Missing IMAP credentials.`);
                    continue;
                }

                const imapConfig = {
                    imap: {
                        user: config.imapUser || config.smtpUser || profile.email,
                        password: config.imapPassword,
                        host: config.imapHost,
                        port: config.imapPort || 993,
                        tls: true,
                        authTimeout: 10000,
                        tlsOptions: { rejectUnauthorized: false }
                    }
                };

                // Connect
                console.log(`Connecting to IMAP for ${profile.email}...`);
                const connection = await imaps.connect(imapConfig);
                await connection.openBox('INBOX');

                // Fetch UNSEEN messages
                const searchCriteria = ['UNSEEN'];
                const fetchOptions = {
                    bodies: ['HEADER', 'TEXT', ''],
                    markSeen: false
                };

                const messages = await connection.search(searchCriteria, fetchOptions);
                console.log(`Found ${messages.length} unseen emails for ${profile.email}.`);

                for (const item of messages) {
                    // Extract body
                    const all = item.parts.find((part: any) => part.which === "");
                    const id = item.attributes.uid;
                    const idHeader = "IMAP-" + id;

                    // Parse Email
                    const parsed = await simpleParser(all ? all.body : "");
                    const subject = parsed.subject || "No Subject";
                    const fromObj = parsed.from?.value[0];
                    const senderEmail = fromObj?.address;
                    const senderName = fromObj?.name;
                    const textBody = parsed.text || "No Content";

                    // AI Analysis
                    console.log(`Analyzing email: ${subject}`);
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
                                { role: 'user', content: `Subject: ${subject}\nFrom: ${senderName} <${senderEmail}>\n\nBody:\n${textBody.substring(0, 3000)}` }
                            ],
                            response_format: { type: "json_object" }
                        }),
                    });

                    const aiJson = await aiResponse.json();
                    const analysis = JSON.parse(aiJson.choices[0].message.content);

                    if (analysis.type === 'lead') {
                        console.log(`LEAD DETECTED: ${analysis.summary}`);

                        // Refine Data
                        const leadData = analysis.leadData || {};
                        if (!leadData.email) leadData.email = senderEmail;
                        if (!leadData.lastName && senderName) {
                            const parts = senderName.split(' ');
                            if (parts.length > 1) {
                                leadData.firstName = parts[0];
                                leadData.lastName = parts.slice(1).join(' ');
                            } else {
                                leadData.lastName = senderName;
                            }
                        }

                        // Determine Assignment
                        const isSharedInbox = profile.email.toLowerCase() === 'buero@polendach24.de';
                        const assignedTo = isSharedInbox ? null : profile.id;

                        // Insert into Leads
                        const { error: insertError } = await supabaseAdmin
                            .from('leads')
                            .insert({
                                status: 'new',
                                source: 'email',
                                customer_data: leadData,
                                notes: `[AI Auto-Import] Source: Email "${subject}"\nSummary: ${analysis.summary}`,
                                email_message_id: idHeader,
                                assigned_to: assignedTo
                            });

                        if (insertError) {
                            console.error('Failed to insert lead:', insertError);
                        } else {
                            results.push({ email: subject, status: 'created_lead' });
                            await connection.addFlags(id, '\\Seen');
                        }

                    } else if (analysis.type === 'service') {
                        console.log(`SERVICE TICKET DETECTED: ${analysis.summary}`);
                        const sData = analysis.serviceData || {};

                        // 1. Find Contract
                        let contractId = null;
                        let clientId = null;

                        if (sData.contractNumber) {
                            const { data: contract } = await supabaseAdmin
                                .from('contracts')
                                .select('id, client_id')
                                .ilike('contract_number', `%${sData.contractNumber}%`)
                                .maybeSingle();

                            if (contract) {
                                contractId = contract.id;
                                clientId = contract.client_id; // Prefer contract's client
                            }
                        }

                        // 2. Find Client by Email if not found by contract
                        if (!clientId && senderEmail) {
                            const { data: customer } = await supabaseAdmin
                                .from('customers')
                                .select('id')
                                .ilike('email', senderEmail)
                                .maybeSingle();
                            if (customer) clientId = customer.id;
                        }

                        // 3. Insert Service Ticket
                        const ticketNumber = `SRV-${Date.now().toString().slice(-6)}`;
                        const { error: insertError } = await supabaseAdmin
                            .from('service_tickets')
                            .insert({
                                ticket_number: ticketNumber,
                                type: 'other', // Default as AI might not map perfectly to enum yet
                                status: 'new',
                                priority: sData.priority || 'medium',
                                description: `[AI Import] ${analysis.summary}\n\nClient Issue: ${sData.issueDescription}`,
                                contract_id: contractId,
                                client_id: clientId, // Can be null if unknown client
                                created_at: new Date().toISOString()
                            });

                        if (insertError) {
                            console.error('Failed to insert service ticket:', insertError);
                        } else {
                            results.push({ email: subject, status: 'created_ticket' });
                            await connection.addFlags(id, '\\Seen');
                        }

                    } else {
                        console.log('Not a lead/service. Skipping.');
                        // Do not mark seen to prevent losing valid email if logic is wrong?
                        // Or logic: If it's analyzed once and rejected, should we analyze it again?
                        // Ideally "Processed" flag.
                    }
                }

                connection.end();

            } catch (err: any) {
                console.error(`Error processing profile ${profile.id}:`, err);
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
