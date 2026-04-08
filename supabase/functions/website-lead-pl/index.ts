// ═══════════════════════════════════════════════════
// website-lead-pl — Public endpoint for zadaszto.pl contact forms
// Inserts leads into Polendach CRM with source 'website_pl'
// ═══════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadRequest {
  name: string;
  phone: string;
  email: string;
  city?: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse body
    const body: LeadRequest = await req.json();

    // ═══ VALIDATION ═══
    if (!body.name || !body.name.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Imię i nazwisko jest wymagane" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body.phone || !body.phone.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Numer telefonu jest wymagany" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body.email || !body.email.trim() || !body.email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Prawidłowy adres e-mail jest wymagany" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══ SERVICE ROLE CLIENT (bypasses RLS) ═══
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ═══ RATE LIMITING — same email can't submit more than once per 5 minutes ═══
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentLeads } = await adminClient
      .from("leads")
      .select("id")
      .eq("source", "website_pl")
      .gte("created_at", fiveMinAgo)
      .contains("customer_data", { email: body.email.trim().toLowerCase() })
      .limit(1);

    if (recentLeads && recentLeads.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Formularz został już wysłany. Odpowiemy w ciągu 24 godzin." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══ PARSE NAME ═══
    const nameParts = body.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // ═══ NORMALIZE PHONE ═══
    let phone = body.phone.trim().replace(/\s+/g, "");
    // If Polish number without prefix, add +48
    if (/^\d{9}$/.test(phone)) phone = "+48" + phone;

    // ═══ INSERT LEAD ═══
    const { data, error } = await adminClient
      .from("leads")
      .insert({
        status: "new",
        source: "website_pl",
        customer_data: {
          firstName,
          lastName,
          phone,
          email: body.email.trim().toLowerCase(),
          city: body.city?.trim() || "",
        },
        notes: body.notes || "",
        assigned_to: null, // will be auto-assigned by system
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Lead insert error:", JSON.stringify(error));
      return new Response(
        JSON.stringify({ success: false, error: "Nie udało się zapisać zgłoszenia. Proszę spróbować ponownie." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[website-lead-pl] New lead created: ${data.id} from ${body.email}`);

    // ═══ AUTO FOLLOW-UP EMAIL (PL) ═══
    try {
      const smtpHost = Deno.env.get("SMTP_HOST");
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPass = Deno.env.get("SMTP_PASS");

      if (smtpHost && smtpUser && smtpPass) {
        const nodemailer = (await import("npm:nodemailer@6.9.13")).default;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        });

        const clientEmail = body.email.trim().toLowerCase();
        const clientName = firstName || "Klient";

        const followUpHtml = `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Zadaszto.pl</h1>
      <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Premium Zadaszenia Tarasowe</p>
    </div>
    
    <!-- Content -->
    <div style="padding:32px;">
      <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">Dziękujemy za zainteresowanie, ${clientName}!</h2>
      
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;font-size:15px;">
        Twoje zapytanie zostało zarejestrowane w naszym systemie i przekazane do odpowiedniego doradcy.
      </p>
      
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:#166534;margin:0;font-size:14px;font-weight:600;">✅ Co dalej?</p>
        <p style="color:#166534;margin:8px 0 0;font-size:14px;line-height:1.6;">
          Nasz doradca skontaktuje się z Tobą <strong>w ciągu 24 godzin</strong>, aby omówić szczegóły i przygotować wstępną wycenę.
        </p>
      </div>

      <p style="color:#475569;line-height:1.7;margin:24px 0 16px;font-size:15px;">
        W międzyczasie zachęcamy do zapoznania się z naszą ofertą na stronie 
        <a href="https://zadaszto.pl" style="color:#2563eb;text-decoration:none;font-weight:600;">zadaszto.pl</a>.
      </p>

      <p style="color:#475569;line-height:1.7;margin:0;font-size:15px;">
        Jeśli masz dodatkowe pytania, odpowiedz na tego maila — chętnie pomożemy!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;margin:0;font-size:13px;line-height:1.6;">
        Z poważaniem,<br>
        <strong style="color:#334155;">Zespół Zadaszto.pl</strong><br>
        Polendach24 GmbH<br>
        <a href="mailto:${smtpUser}" style="color:#2563eb;text-decoration:none;">${smtpUser}</a>
      </p>
    </div>
  </div>
</body>
</html>`;

        await transporter.sendMail({
          from: `Zadaszto.pl <${smtpUser}>`,
          to: clientEmail,
          subject: `Dziękujemy za zapytanie — ${clientName}! | Zadaszto.pl`,
          html: followUpHtml,
        });

        console.log(`[website-lead-pl] ✅ Auto follow-up sent to ${clientEmail}`);
      } else {
        console.warn("[website-lead-pl] SMTP not configured — follow-up email skipped");
      }
    } catch (emailErr) {
      // Don't fail the lead creation if email fails
      console.error("[website-lead-pl] Follow-up email error:", emailErr);
    }

    // ═══ AUTO-ASSIGN (optional — call if your system has this) ═══
    // The lead-auto-assign service in the app will pick it up on next check,
    // or you can trigger it here:
    // await adminClient.rpc('auto_assign_lead', { lead_id: data.id });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: data.id,
        message: "Dziękujemy! Odpowiemy w ciągu 24 godzin.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Nieznany błąd serwera",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
