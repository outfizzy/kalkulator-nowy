// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ads-competitor-intel — Autonomous Competitive Intelligence Agent
//
// Runs weekly (every Monday) — scrapes 7 competitors for:
// 1. Website changes (new products, pricing, messaging)
// 2. Meta tags / SEO strategy evolution
// 3. Offering gaps analysis vs zadaszto.pl
// 4. Auto-generates counter-proposals to stay ahead
//
// Pattern: 200-OK Payload
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function fail(msg: string) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══ COMPETITOR REGISTRY ═══
const COMPETITORS = [
  {
    name: "TWIGO",
    url: "https://www.twigo.pl",
    threat: "high",
    known_strengths: ["ISO 9001", "od 11k PLN", "45 osób", "eksport DE/AT/AU"],
    known_weaknesses: ["brak konfiguratora 3D", "brak carportów", "1 model lamelowy"],
    keywords_to_watch: ["twigo pergola", "twigo opinie"],
  },
  {
    name: "Zabudowy Tarasu (ESKA)",
    url: "https://zabudowytarasu.pl",
    threat: "high",
    known_strengths: ["konfigurator", "11 miast SEO", "B2B portal", "od 1993"],
    known_weaknesses: ["brak smart home", "brak HoReCa linii", "brak Designstyle"],
    keywords_to_watch: ["zabudowy tarasu", "eska pergola"],
  },
  {
    name: "AMPERGOLA",
    url: "https://ampergola.pl",
    threat: "medium",
    known_strengths: ["anodowane alu (baseny)", "20 lat", "realizacja 4 tyg"],
    known_weaknesses: ["1 model", "brak carportu", "stara strona"],
    keywords_to_watch: ["ampergola"],
  },
  {
    name: "APLO",
    url: "https://www.aplo.com.pl",
    threat: "medium",
    known_strengths: ["Warszawa", "30 lat", "10 modeli", "HoReCa", "kuchnie ogrodowe"],
    known_weaknesses: ["tylko Warszawa", "max 5 lat gwarancji", "brak CE DIN EN"],
    keywords_to_watch: ["aplo pergola", "aplo warszawa"],
  },
  {
    name: "ALUBOSS",
    url: "https://aluboss.pl",
    threat: "low",
    known_strengths: ["ceny jawne 13.5-18k", "sklep online", "konfigurator prosty"],
    known_weaknesses: ["brak bioklimatycznych", "niższa półka"],
    keywords_to_watch: ["aluboss"],
  },
  {
    name: "Krajewski",
    url: "https://krajewski.pl",
    threat: "low",
    known_strengths: ["showroom Gliwice", "33 lata", "duże referencje"],
    known_weaknesses: ["pergole = marginalny produkt", "brak konfiguratora"],
    keywords_to_watch: ["krajewski pergola"],
  },
  {
    name: "Tarasy4U",
    url: "https://tarasy4u.pl",
    threat: "low",
    known_strengths: ["deski + zadaszenia", "10 modeli"],
    known_weaknesses: ["mała firma", "brak automatyki", "przestarzała strona"],
    keywords_to_watch: ["tarasy4u"],
  },
];

// Our moat — used for gap analysis
const OUR_MOAT = [
  "Konfigurator 3D prawdziwy",
  "Smart sterowanie z aplikacji (Pergola Deluxe, SOMFY)",
  "Certyfikat CE DIN EN 1090",
  "10 lat gwarancji na konstrukcję",
  "8 modeli produktowych + 8 kategorii dodatków",
  "Skystyle = dedykowana linia HoReCa",
  "Designstyle = przesuwny dach szklany",
  "35+ kolorów RAL + Champagne + DB703",
  "Doświadczenie rynku DE (PolenDach24)",
  "Montaż ogólnopolski z własnymi ekipami",
];

// ═══ SCRAPE COMPETITOR PAGE ═══
async function scrapeCompetitor(url: string): Promise<{
  title: string;
  description: string;
  headings: string[];
  links: string[];
  phones: string[];
  prices: string[];
  keywords: string[];
  raw_length: number;
} | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = descMatch?.[1]?.trim() || "";

    // Extract H1-H3 headings
    const headingMatches = html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
    const headings = [...headingMatches].map(m => m[1].trim()).filter(h => h.length > 3).slice(0, 15);

    // Extract nav links (products/categories)
    const linkMatches = html.matchAll(/href=["']([^"']+)["'][^>]*>([^<]{3,50})<\/a>/gi);
    const links = [...new Set([...linkMatches].map(m => m[2].trim()).filter(l => 
      !l.includes("cookie") && !l.includes("privacy") && !l.includes("regulamin")
    ))].slice(0, 30);

    // Extract phone numbers
    const phoneMatches = html.matchAll(/(?:tel:)?(\+?48[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{3})/g);
    const phones = [...new Set([...phoneMatches].map(m => m[1].replace(/\s/g, "")))];

    // Extract prices (PLN)
    const priceMatches = html.matchAll(/(\d[\d\s,.]+)\s*(?:PLN|zł|złotych)/gi);
    const prices = [...new Set([...priceMatches].map(m => m[1].trim()))].slice(0, 10);

    // Extract keywords from meta
    const kwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
    const keywords = kwMatch?.[1]?.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 2) || [];

    return {
      title,
      description,
      headings,
      links,
      phones,
      prices,
      keywords,
      raw_length: html.length,
    };
  } catch (err) {
    console.warn(`[competitor-intel] Scrape error for ${url}:`, err);
    return null;
  }
}

// ═══ DETECT CHANGES ═══
function detectChanges(
  current: any,
  previous: any
): string[] {
  const changes: string[] = [];
  if (!previous) {
    changes.push("🆕 Pierwsza analiza — baseline zapisany");
    return changes;
  }

  if (current.title !== previous.title) {
    changes.push(`📝 Zmiana tytułu: "${previous.title}" → "${current.title}"`);
  }
  if (current.description !== previous.description) {
    changes.push(`📝 Zmiana meta description`);
  }

  // New headings = new products/sections
  const prevHeadings = new Set(previous.headings || []);
  const newHeadings = (current.headings || []).filter((h: string) => !prevHeadings.has(h));
  if (newHeadings.length > 0) {
    changes.push(`🆕 Nowe sekcje/produkty: ${newHeadings.slice(0, 5).join(", ")}`);
  }

  // New links = new pages
  const prevLinks = new Set(previous.links || []);
  const newLinks = (current.links || []).filter((l: string) => !prevLinks.has(l));
  if (newLinks.length > 0) {
    changes.push(`🔗 Nowe linki: ${newLinks.slice(0, 5).join(", ")}`);
  }

  // Price changes
  const prevPrices = new Set(previous.prices || []);
  const newPrices = (current.prices || []).filter((p: string) => !prevPrices.has(p));
  if (newPrices.length > 0) {
    changes.push(`💰 Nowe/zmienione ceny: ${newPrices.join(", ")} PLN`);
  }

  // Page size change (significant redesign indicator)
  const sizeDiff = Math.abs(current.raw_length - (previous.raw_length || 0));
  if (sizeDiff > 5000) {
    changes.push(`🎨 Duża zmiana strony (${sizeDiff > 0 ? "+" : ""}${Math.round(sizeDiff / 1000)}KB) — możliwy redesign`);
  }

  return changes;
}

// ═══ GENERATE STRATEGIC RECOMMENDATION ═══
function generateRecommendation(
  competitor: typeof COMPETITORS[0],
  scrapeData: any,
  changes: string[]
): string | null {
  if (changes.length <= 1 && changes[0]?.includes("baseline")) return null;

  const recs: string[] = [];

  // Check for new products
  const productKeywords = ["pergola", "carport", "zadaszenie", "zabudowa", "bioklimatyczna", "ogród zimowy"];
  const newProductMentions = changes.filter(c => 
    productKeywords.some(pk => c.toLowerCase().includes(pk))
  );
  if (newProductMentions.length > 0) {
    recs.push(`${competitor.name} rozszerza ofertę. Rozważ zwiększenie stawek na kampanię [COMPETITOR] dla fraz "${competitor.keywords_to_watch.join('", "')}".`);
  }

  // Price competition
  if (changes.some(c => c.includes("💰"))) {
    recs.push(`${competitor.name} zmienił ceny. Monituj ich oferty i podkreślaj nasze USP (10 lat gwarancji, CE DIN EN 1090) w ad copy kampanii [COMPETITOR].`);
  }

  // Redesign = marketing push
  if (changes.some(c => c.includes("🎨"))) {
    recs.push(`${competitor.name} przebudowuje stronę — prawdopodobnie szykuje kampanię marketingową. Rozważ preemptive bid boost +20% na frazy ich marki.`);
  }

  return recs.length > 0 ? recs.join(" ") : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().slice(0, 10);
    let scraped = 0;
    let changes_detected = 0;
    let proposals_created = 0;
    const allChanges: string[] = [];
    const competitorSummaries: string[] = [];

    // ═══ 1. SCRAPE ALL COMPETITORS ═══
    for (const comp of COMPETITORS) {
      console.log(`[competitor-intel] Scraping ${comp.name} (${comp.url})...`);
      const data = await scrapeCompetitor(comp.url);
      if (!data) {
        competitorSummaries.push(`❌ ${comp.name}: scrape failed`);
        continue;
      }
      scraped++;

      // Get previous scrape from knowledge base
      const { data: prevEntries } = await supabase
        .from("ads_knowledge_base")
        .select("full_content")
        .eq("source_type", "competitor_scrape")
        .ilike("title", `%${comp.name}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      const previous = prevEntries?.[0]?.full_content
        ? JSON.parse(prevEntries[0].full_content)
        : null;

      // Detect changes
      const changes = detectChanges(data, previous);
      changes_detected += changes.length;

      // Build summary
      const summary = [
        `🏢 ${comp.name} (${comp.threat.toUpperCase()}) — ${comp.url}`,
        `📄 Title: "${data.title}"`,
        `📝 Desc: "${data.description?.slice(0, 100)}..."`,
        `🏷️ Sekcje: ${data.headings.slice(0, 5).join(" | ")}`,
        data.prices.length > 0 ? `💰 Ceny: ${data.prices.join(", ")} PLN` : "",
        data.phones.length > 0 ? `📞 Tel: ${data.phones.join(", ")}` : "",
        changes.length > 0 ? `\n📣 ZMIANY:\n${changes.map(c => `  ${c}`).join("\n")}` : "✅ Brak zmian",
      ].filter(Boolean).join("\n");

      competitorSummaries.push(summary);

      // Save scrape to knowledge base
      await supabase.from("ads_knowledge_base").insert({
        title: `Scrape: ${comp.name} ${today}`,
        summary: summary,
        tags: ["competitor", "scrape", comp.name.toLowerCase(), today.slice(0, 7)],
        source_type: "competitor_scrape",
        full_content: JSON.stringify(data),
        relevance_score: comp.threat === "high" ? 0.9 : comp.threat === "medium" ? 0.7 : 0.5,
      });

      // Generate proposal if significant changes
      if (changes.length > 0 && !changes[0]?.includes("baseline")) {
        const rec = generateRecommendation(comp, data, changes);
        if (rec) {
          await supabase.from("ads_proposals").insert({
            title: `🕵️ Zmiana u ${comp.name}: ${changes[0]?.slice(0, 60)}`,
            description: rec,
            type: "competitor_response",
            risk_level: comp.threat === "high" ? "medium" : "low",
            status: "pending_approval",
            reasoning_full: `[Competitor Intel Agent] ${comp.name} (${comp.threat} threat) wprowadził zmiany na stronie ${comp.url}. Zmiany: ${changes.join("; ")}. Rekomendacja automatyczna oparta na analizie competitive intelligence.`,
            source: "competitor_agent",
          });
          proposals_created++;
        }

        allChanges.push(`${comp.name}: ${changes.join("; ")}`);
      }

      // Polite delay between scrapes
      await new Promise(r => setTimeout(r, 2000));
    }

    // ═══ 2. COMPETITIVE LANDSCAPE SUMMARY ═══
    const landscapeSummary = [
      `═══ COMPETITIVE INTELLIGENCE REPORT ${today} ═══\n`,
      `Przeanalizowano: ${scraped}/${COMPETITORS.length} konkurentów`,
      `Wykryte zmiany: ${changes_detected}`,
      `Wygenerowane propozycje: ${proposals_created}`,
      `\n═══ NASZ MOAT (przewagi do komunikacji) ═══`,
      ...OUR_MOAT.map(m => `✅ ${m}`),
      `\n═══ SZCZEGÓŁY KONKURENCJI ═══\n`,
      ...competitorSummaries,
    ].join("\n");

    await supabase.from("ads_knowledge_base").insert({
      title: `Raport CI ${today}`,
      summary: landscapeSummary,
      tags: ["competitor", "weekly-report", "intelligence", today.slice(0, 7)],
      source_type: "competitor_report",
      relevance_score: 0.95,
    });

    // ═══ 3. ALERT IF HIGH-THREAT COMPETITORS CHANGED ═══
    const highThreatChanges = allChanges.filter(c =>
      COMPETITORS.filter(comp => comp.threat === "high")
        .some(comp => c.startsWith(comp.name))
    );
    if (highThreatChanges.length > 0) {
      await supabase.from("ads_alerts").insert({
        severity: "warning",
        type: "competitor_alert",
        message: `🕵️ Zmiany u kluczowych konkurentów: ${highThreatChanges.join(" | ")}. Sprawdź propozycje w ads_proposals.`,
      });
    }

    // ═══ 4. AUDIT LOG ═══
    await supabase.from("ads_audit_log").insert({
      operation: "competitor_intel",
      customer_id: "system",
      resource_type: "competitor",
      payload: {
        scraped,
        changes_detected,
        proposals_created,
        high_threat_changes: highThreatChanges.length,
      },
      success: true,
      triggered_by: "cron",
    });

    console.log(`[competitor-intel] Done: ${scraped} scraped, ${changes_detected} changes, ${proposals_created} proposals`);

    return ok({
      scraped,
      changes_detected,
      proposals_created,
      competitors: competitorSummaries.map(s => s.split("\n")[0]),
    });
  } catch (error: any) {
    console.error("[competitor-intel] Error:", error?.message);
    return fail(error?.message || "Unknown error");
  }
});
