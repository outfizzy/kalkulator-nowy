import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// MESSENGER WEBHOOK — AI Chatbot for Polendach24
// Handles FB Messenger messages, Claude AI responses, CRM leads
// Conversations persisted in DB (messenger_conversations + messenger_messages)
// ═══════════════════════════════════════════════════

const FB_PAGE_ACCESS_TOKEN = Deno.env.get("FB_ACCESS_TOKEN") || "";
const FB_VERIFY_TOKEN = Deno.env.get("FB_WEBHOOK_VERIFY_TOKEN") || "polendach24_verify_2026";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GRAPH_API = "https://graph.facebook.com/v25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ─── System prompt for AI assistant ───
const SYSTEM_PROMPT = `Du bist der freundliche und kompetente digitale Assistent von Polendach24 – einem Spezialisten für hochwertige Aluminium-Terrassenüberdachungen, Pergolen, Carports und Wintergärten in Deutschland.

DEINE AUFGABEN:
1. Begrüße Kunden freundlich und professionell
2. Beantworte Fragen zu unseren Produkten (Terrassendächer, Pergolen, Carports, Wintergärten, Vordächer, Seitenwände, WPC-Zäune)
3. Sammle Kontaktdaten (Name, Telefon, E-Mail, PLZ) für ein individuelles Angebot
4. Leite bei komplexen Fragen an einen Berater weiter

PRODUKTE & PREISE (Richtwerte):
- Terrassenüberdachung Aluminium: ab 3.500€ (abhängig von Größe/Modell)
- Bioklimatische Pergola: ab 8.000€ (mit drehbaren Lamellen)
- Carport Aluminium: ab 4.000€
- Wintergarten: ab 12.000€
- Vordach: ab 1.200€
- WPC-Sichtschutzzaun: ab 120€/lfm

WICHTIGE INFOS:
- Kostenlose Beratung vor Ort in ganz Deutschland
- Montage durch eigenes Team (keine Subunternehmer)
- 10 Jahre Garantie auf alle Produkte
- Lieferzeit: 4-6 Wochen nach Auftragsbestätigung
- Finanzierung möglich

KOMMUNIKATIONSREGELN:
- Antworte IMMER auf Deutsch
- Sei freundlich, aber professionell
- Halte Antworten kurz (max 3-4 Sätze im Messenger)
- Nutze Emojis sparsam (max 1-2 pro Nachricht)
- Frage nach PLZ für regionale Beratung
- Wenn du die Antwort nicht weißt, sage es ehrlich und biete einen Rückruf an

LEAD-QUALIFIZIERUNG:
Versuche immer folgende Infos zu sammeln:
1. Welches Produkt interessiert den Kunden?
2. Ungefähre Maße (Breite x Tiefe)?
3. PLZ / Ort?
4. Name und Telefonnummer für Rückruf?

Wenn du alle Infos hast, sage: "Vielen Dank! Unser Berater wird sich innerhalb von 24 Stunden bei Ihnen melden. 🏠"`;

// ─── Supabase client (lazy) ───
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ─── CORS ───
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ═══════════════════════════════════════
  // GET — Webhook Verification (Facebook)
  // ═══════════════════════════════════════
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
      console.log("✅ Webhook verified!");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ═══════════════════════════════════════
  // POST — Incoming Messages
  // ═══════════════════════════════════════
  if (req.method === "POST") {
    try {
      const body = await req.json();

      // Check if this is a page event
      if (body.object !== "page") {
        return new Response("Not a page event", { status: 200 });
      }

      // Process each entry
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id;
          const messageText = event.message?.text;

          if (!senderId || !messageText) continue;

          // Don't respond to echoes (our own messages)
          if (event.message?.is_echo) continue;

          console.log(`📨 Message from ${senderId}: ${messageText}`);

          try {
            await processMessage(senderId, messageText);
          } catch (err) {
            console.error(`Error processing message from ${senderId}:`, err);
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (err: any) {
      console.error("Webhook error:", err);
      return new Response("EVENT_RECEIVED", { status: 200 }); // Always return 200 to FB
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

// ═══════════════════════════════════════
// MAIN MESSAGE PROCESSING PIPELINE
// ═══════════════════════════════════════
async function processMessage(senderId: string, messageText: string): Promise<void> {
  const sb = getSupabase();

  // 1. Get sender profile from FB
  const profile = await getSenderProfile(senderId);
  const senderName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Messenger User";

  // 2. Get or create conversation in DB
  let conversation = await getOrCreateConversation(sb, senderId, senderName, profile.profile_pic);

  // 3. Load conversation history from DB
  const history = await loadConversationHistory(sb, conversation?.id);

  // 4. Extract lead data from this message
  const leadData = { ...(conversation?.lead_data || {}) };
  extractLeadData(messageText, leadData);

  // 5. Build messages array for Claude
  const messages = [
    ...history,
    { role: "user", content: messageText },
  ];

  // 6. Generate AI response
  const aiResponse = await generateAIResponse(messages);

  // 7. Send response via Messenger
  await sendMessengerMessage(senderId, aiResponse);

  // 8. Persist to DB
  if (sb && conversation) {
    // Save inbound message
    await sb.from("messenger_messages").insert({
      conversation_id: conversation.id,
      sender_id: senderId,
      sender_name: senderName,
      direction: "inbound",
      message: messageText,
      ai_response: aiResponse,
      lead_data: leadData,
    });

    // Update conversation metadata
    await sb.from("messenger_conversations").update({
      lead_data: leadData,
      message_count: (conversation.message_count || 0) + 1,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", conversation.id);
  }

  // 9. Sync to CRM leads
  await syncLeadToCRM(sb, senderId, senderName, profile, leadData, messageText, aiResponse, conversation?.id);
}

// ─── Get or create conversation ───
async function getOrCreateConversation(sb: any, senderId: string, senderName: string, profilePic?: string) {
  if (!sb) return null;

  // Try to find existing conversation
  const { data: existing } = await sb
    .from("messenger_conversations")
    .select("*")
    .eq("sender_id", senderId)
    .maybeSingle();

  if (existing) return existing;

  // Create new conversation
  const { data: created } = await sb
    .from("messenger_conversations")
    .insert({
      sender_id: senderId,
      sender_name: senderName,
      sender_profile_pic: profilePic || null,
      lead_data: {},
      status: "active",
      message_count: 0,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  return created;
}

// ─── Load conversation history from DB ───
async function loadConversationHistory(sb: any, conversationId?: string): Promise<Array<{role: string, content: string}>> {
  if (!sb || !conversationId) return [];

  const { data: messages } = await sb
    .from("messenger_messages")
    .select("direction, message, ai_response")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(10);

  if (!messages || messages.length === 0) return [];

  const history: Array<{role: string, content: string}> = [];
  for (const msg of messages) {
    if (msg.direction === "inbound") {
      history.push({ role: "user", content: msg.message });
      if (msg.ai_response) {
        history.push({ role: "assistant", content: msg.ai_response });
      }
    }
  }

  return history;
}

// ─── Generate AI Response using Claude ───
async function generateAIResponse(messages: Array<{role: string, content: string}>): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "Vielen Dank für Ihre Nachricht! 🏠 Unser Team wird sich schnellstmöglich bei Ihnen melden. Sie können uns auch direkt anrufen.";
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      }),
    });

    const data = await response.json();

    if (data.content?.[0]?.text) {
      return data.content[0].text;
    }

    return "Danke für Ihre Nachricht! Ein Berater meldet sich in Kürze bei Ihnen. 🏠";
  } catch (err) {
    console.error("Claude API error:", err);
    return "Vielen Dank! Unser Team wird sich bei Ihnen melden. Sie können uns auch telefonisch erreichen.";
  }
}

// ─── Send message via Messenger API ───
async function sendMessengerMessage(recipientId: string, text: string): Promise<void> {
  try {
    const chunks = splitMessage(text, 1900);

    for (const chunk of chunks) {
      // Typing indicator
      await fetch(`${GRAPH_API}/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: "typing_on",
        }),
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      // Send message
      const res = await fetch(`${GRAPH_API}/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: chunk },
        }),
      });

      const data = await res.json();
      if (data.error) {
        console.error("Messenger send error:", data.error);
      }
    }
  } catch (err) {
    console.error("Failed to send Messenger message:", err);
  }
}

// ─── Get sender profile from Facebook ───
async function getSenderProfile(senderId: string): Promise<any> {
  try {
    const res = await fetch(
      `${GRAPH_API}/${senderId}?fields=first_name,last_name,profile_pic&access_token=${FB_PAGE_ACCESS_TOKEN}`
    );
    return await res.json();
  } catch (err) {
    return { first_name: "Messenger", last_name: "User" };
  }
}

// ─── Extract lead data from messages ───
function extractLeadData(message: string, leadData: any): void {
  // Phone number
  const phoneMatch = message.match(/(\+?\d[\d\s\-\/]{7,})/);
  if (phoneMatch) leadData.phone = phoneMatch[1].replace(/[\s\-\/]/g, "");

  // Email
  const emailMatch = message.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) leadData.email = emailMatch[0];

  // PLZ (German postal code)
  const plzMatch = message.match(/\b(\d{5})\b/);
  if (plzMatch) leadData.plz = plzMatch[1];

  // Product interest
  const products: Record<string, string[]> = {
    terrassendach: ["terrasse", "terrassendach", "überdachung", "dach", "terrassenüberdachung"],
    pergola: ["pergola", "lamellen", "bioklimatisch"],
    carport: ["carport", "auto", "garage", "stellplatz"],
    wintergarten: ["wintergarten", "winter"],
    vordach: ["vordach", "eingang", "haustür"],
    zaun: ["zaun", "sichtschutz", "wpc", "fence"],
  };

  const lower = message.toLowerCase();
  for (const [product, keywords] of Object.entries(products)) {
    if (keywords.some(kw => lower.includes(kw))) {
      leadData.product = product;
    }
  }

  // Dimensions
  const dimMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×|mal)\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter)?/);
  if (dimMatch) {
    leadData.width = dimMatch[1].replace(",", ".");
    leadData.depth = dimMatch[2].replace(",", ".");
  }

  // Name extraction
  const nameMatch = message.match(/(?:ich bin|mein name ist|ich heiße)\s+(\w+(?:\s+\w+)?)/i);
  if (nameMatch) leadData.name = nameMatch[1];
}

// ─── Sync to CRM leads table ───
async function syncLeadToCRM(
  sb: any,
  senderId: string,
  senderName: string,
  profile: any,
  leadData: any,
  lastMessage: string,
  aiResponse: string,
  conversationId?: string,
): Promise<void> {
  if (!sb) return;

  try {
    const fullName = leadData.name || senderName || "Messenger Lead";

    // Build customer_data jsonb matching actual leads schema
    const customerData: Record<string, any> = {
      name: fullName,
      source_detail: "facebook_messenger",
      messenger_sender_id: senderId,
    };
    if (leadData.phone) customerData.phone = leadData.phone;
    if (leadData.email) customerData.email = leadData.email;
    if (leadData.plz) customerData.city = `PLZ ${leadData.plz}`;
    if (leadData.product) customerData.product_interest = leadData.product;
    if (leadData.width && leadData.depth) customerData.dimensions = `${leadData.width}x${leadData.depth}m`;
    if (profile.profile_pic) customerData.avatar_url = profile.profile_pic;

    // Build notes
    const notesLines = [
      `[Messenger Bot] Letzte Nachricht: "${lastMessage}"`,
      `AI Antwort: "${aiResponse}"`,
      leadData.product ? `Produkt: ${leadData.product}` : "",
      leadData.plz ? `PLZ: ${leadData.plz}` : "",
      leadData.width ? `Maße: ${leadData.width}x${leadData.depth}m` : "",
    ].filter(Boolean).join("\n");

    // Check if lead already exists for this Messenger sender
    // We search by customer_data->messenger_sender_id
    const { data: existing } = await sb
      .from("leads")
      .select("id")
      .eq("source", "facebook_messenger")
      .filter("customer_data->>messenger_sender_id", "eq", senderId)
      .maybeSingle();

    if (existing) {
      // Update existing lead
      await sb.from("leads").update({
        customer_data: customerData,
        notes: notesLines,
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);

      // Link conversation to lead
      if (conversationId) {
        await sb.from("messenger_conversations").update({ lead_id: existing.id }).eq("id", conversationId);
      }
    } else {
      // Create new lead
      const { data: newLead } = await sb.from("leads").insert({
        source: "facebook_messenger",
        status: "new",
        customer_data: customerData,
        notes: notesLines,
        last_contact_date: new Date().toISOString(),
      }).select("id").single();

      // Link conversation to lead
      if (conversationId && newLead) {
        await sb.from("messenger_conversations").update({ lead_id: newLead.id }).eq("id", conversationId);
      }
    }
  } catch (err) {
    console.error("CRM sync error:", err);
  }
}

// ─── Helper: Split long messages ───
function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf(". ", maxLen);
    if (splitAt < maxLen / 2) splitAt = remaining.lastIndexOf(" ", maxLen);
    if (splitAt < maxLen / 2) splitAt = maxLen;
    chunks.push(remaining.substring(0, splitAt + 1).trim());
    remaining = remaining.substring(splitAt + 1).trim();
  }
  return chunks;
}
