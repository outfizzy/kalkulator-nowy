// ============================================================================
// Polendach24 Pricing Worker — HTTP server for on-demand price queries
// Runs locally (or on VPS) and serves real-time Aluxe prices
// 
// v4 — With OFFER QUEUE: max 1 concurrent offer-agent, rest waits in FIFO queue
//
// Usage: npx tsx scripts/pricing-worker.ts
// API:   POST http://localhost:3456/api/price
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { AluxePricingService, PRODUCT_LINE_MAP, type PriceRequest } from '../src/automation/worker/aluxe-pricing-service';
import { BotPricingOrchestrator, type BotPricingRequest, type BotPricingResult } from '../src/automation/worker/bot-pricing-orchestrator';
import { formatEUR } from '../src/automation/worker/pricing-engine';
import { ConfiguratorKnowledgeBase } from '../src/automation/worker/configurator-knowledge-base';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PORT = parseInt(process.env.WORKER_PORT || '3456');
const API_KEY = process.env.WORKER_API_KEY || 'polendach24-dev';

let service: AluxePricingService;
let requestCount = 0;

// Knowledge Base — self-learning system
const kb = new ConfiguratorKnowledgeBase();

function log(msg: string) {
  console.log(`[${new Date().toISOString().substring(11, 19)}] ${msg}`);
}

// ============================================================================
// OFFER QUEUE — Sequential processing, max 1 at a time
// ============================================================================

interface QueueItem {
  id: number;
  customerName: string;
  dimensions: string;
  enqueuedAt: Date;
  startedAt?: Date;
  resolve: (result: BotPricingResult) => void;
  reject: (error: Error) => void;
  request: BotPricingRequest;
}

class OfferQueue {
  private queue: QueueItem[] = [];
  private processing: QueueItem | null = null;
  private completedCount = 0;
  private failedCount = 0;
  private totalProcessingMs = 0;

  get length() { return this.queue.length; }
  get isProcessing() { return this.processing !== null; }
  get currentJob() { return this.processing; }
  get stats() {
    return {
      queueLength: this.queue.length,
      isProcessing: !!this.processing,
      currentJob: this.processing ? {
        id: this.processing.id,
        customer: this.processing.customerName,
        dimensions: this.processing.dimensions,
        runningFor: this.processing.startedAt
          ? `${((Date.now() - this.processing.startedAt.getTime()) / 1000).toFixed(0)}s`
          : 'starting...',
      } : null,
      waiting: this.queue.map((item, idx) => ({
        position: idx + 1,
        customer: item.customerName,
        dimensions: item.dimensions,
        waitingFor: `${((Date.now() - item.enqueuedAt.getTime()) / 1000).toFixed(0)}s`,
      })),
      completed: this.completedCount,
      failed: this.failedCount,
      avgProcessingTime: this.completedCount > 0
        ? `${(this.totalProcessingMs / this.completedCount / 1000).toFixed(1)}s`
        : 'n/a',
    };
  }

  enqueue(request: BotPricingRequest): Promise<BotPricingResult> & { position: number } {
    let resolve!: (result: BotPricingResult) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<BotPricingResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    requestCount++;
    const item: QueueItem = {
      id: requestCount,
      customerName: request.customerName || 'Unbekannt',
      dimensions: `${request.width}×${request.depth}`,
      enqueuedAt: new Date(),
      resolve,
      reject,
      request,
    };

    this.queue.push(item);
    const position = this.queue.length + (this.processing ? 1 : 0);

    if (position === 1) {
      log(`📥 #${item.id} ${item.customerName} ${item.dimensions} — Starte sofort`);
    } else {
      log(`📥 #${item.id} ${item.customerName} ${item.dimensions} — Position ${position} in Warteschlange (${this.queue.length} wartend)`);
    }

    // Kick processing if not already running
    this.processNext();

    const result = promise as Promise<BotPricingResult> & { position: number };
    result.position = position;
    return result;
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;

    const item = this.queue.shift()!;
    this.processing = item;
    item.startedAt = new Date();

    const waitTime = (item.startedAt.getTime() - item.enqueuedAt.getTime()) / 1000;
    if (waitTime > 1) {
      log(`⏱️ #${item.id} ${item.customerName} — Wartezeit: ${waitTime.toFixed(1)}s — Starte jetzt`);
    }

    try {
      log(`🤖 #${item.id} OFFER-AGENT: ${item.customerName} ${item.dimensions}`);

      const orchestrator = new BotPricingOrchestrator({
        aluxe: process.env.ALUXE_USERNAME && process.env.ALUXE_PASSWORD
          ? { username: process.env.ALUXE_USERNAME, password: process.env.ALUXE_PASSWORD }
          : undefined,
        teranda: process.env.TERANDA_EMAIL && process.env.TERANDA_PASSWORD
          ? { email: process.env.TERANDA_EMAIL, password: process.env.TERANDA_PASSWORD }
          : undefined,
        aliplast: process.env.ALIPLAST_EMAIL && process.env.ALIPLAST_PASSWORD
          ? { email: process.env.ALIPLAST_EMAIL, password: process.env.ALIPLAST_PASSWORD }
          : undefined,
      });

      const result = await orchestrator.getQuotes(item.request);
      await orchestrator.close();

      const durationMs = Date.now() - item.startedAt.getTime();
      this.totalProcessingMs += durationMs;
      this.completedCount++;

      log(`✅ #${item.id} OFFER-AGENT done in ${(durationMs / 1000).toFixed(1)}s — ${result.liveQuotes.filter(q => q.success).length} prices`);

      // 🧠 LOG TO KNOWLEDGE BASE — every quote becomes training data
      for (const q of result.liveQuotes) {
        kb.recordPrice({
          supplier: q.supplier,
          product: q.product,
          width: item.request.width,
          depth: item.request.depth,
          height: item.request.height,
          color: item.request.color,
          priceNetEUR: q.price || 0,
          success: q.success,
          error: q.success ? undefined : `Failed in ${q.durationMs}ms`,
          durationMs: q.durationMs,
          timestamp: new Date().toISOString(),
          leadId: item.request.leadId,
        });

        // Health check per supplier
        kb.recordHealthCheck({
          supplier: q.supplier,
          product: q.product,
          timestamp: new Date().toISOString(),
          success: q.success,
          priceEUR: q.price || 0,
          durationMs: q.durationMs,
          error: q.success ? undefined : 'Query failed',
        });

        // Anomaly check on successful prices
        if (q.success && q.price > 0) {
          const anomaly = kb.checkPriceAnomaly(q.supplier, q.product, item.request.width, item.request.depth, q.price);
          if (anomaly.isAnomaly) {
            log(`⚠️ 🧠 ANOMALY: ${q.supplier}/${q.product} ${q.price.toFixed(0)}€ — ${anomaly.reason}`);
          }
        }
      }
      kb.save(); // Force save after each offer

      if (this.queue.length > 0) {
        log(`📋 Warteschlange: ${this.queue.length} verbleibend → nächster: ${this.queue[0].customerName}`);
      }

      item.resolve(result);
    } catch (err) {
      this.failedCount++;
      log(`❌ #${item.id} OFFER-AGENT error: ${(err as Error).message}`);
      item.reject(err as Error);
    } finally {
      this.processing = null;
      // Process next in queue
      this.processNext();
    }
  }
}

const offerQueue = new OfferQueue();

// ============================================================================
// VARIANT BUILDER — single source of truth for offers.variants
// Used by BOTH the /api/offer-agent callback and the stuck-offer recovery,
// so the public offer page (BotOfferView) always receives the same
// TierVariant shape (tier, label, prices, positions, structural details).
// ============================================================================

const INSTALLATION_COST_EUR = 1200; // 1 Montagetag inkl. Transport (netto)
const INSTALLATION_DAYS = 1;

// Map supplier names → Polendach24 brand names (customer-facing)
const BRAND_NAME_MAP: Record<string, string> = {
  'teranda tr15 polycarbonat': 'Trendstyle 15',
  'teranda tr15 poly': 'Trendstyle 15',
  'teranda tr15 glas': 'Trendstyle 15',
  'teranda tr15': 'Trendstyle 15',
  'trendline': 'Trendstyle 15',
  'trendstyle 15': 'Trendstyle 15',
  'orangeline': 'Orangestyle 10',
  'orangestyle 10': 'Orangestyle 10',
  'topline': 'Topstyle 20',
  'topstyle 20': 'Topstyle 20',
  'skyline': 'Skystyle',
  'skystyle': 'Skystyle',
  'designline': 'Designline',
  'ultraline': 'Ultrastyle',
  'ultrastyle': 'Ultrastyle',
  'pergola nuun eco pojedyncza/modułowa': 'Pergola-Lamellendach',
  'pergola nuun eco': 'Pergola-Lamellendach',
  'pergola-lamellendach': 'Pergola-Lamellendach',
};

function toCustomerModelName(roofName: string): string {
  const rawName = roofName
    .replace(/ mit (Polycarbonat|Glas)$/i, '')
    .replace(/ \(Flachdach\)$/i, '')
    .trim();
  return BRAND_NAME_MAP[rawName.toLowerCase()] || rawName;
}

function buildVariantsFromPackages(
  packages: any[],
  ctx: { width: number | string; depth: number | string; color?: string }
): any[] {
  const widthNum = parseInt(String(ctx.width));
  const depthNum = parseInt(String(ctx.depth));

  // Pakiet bez wycenionego dachu = cena bez głównego komponentu → NIE publikujemy
  // (inaczej frontend posortuje go jako "najtańszy" i pokaże bzdurną kotwicę).
  const publishable = packages.filter((pkg: any) => {
    const hasRoofPrice = pkg.items?.some((i: any) => i.category === 'roof' && !i.missingData && (i.purchaseNetto || 0) > 0);
    if (!hasRoofPrice) log(`⚠️ Paket '${pkg.nameDE}' ohne Dach-Preis — wird nicht veröffentlicht`);
    return hasRoofPrice;
  });

  return publishable.map((pkg: any) => {
    const roofItem = pkg.items?.find((i: any) => i.category === 'roof');
    const roofName = roofItem?.name || 'Terrassendach';
    const modelName = toCustomerModelName(roofName);

    // Features dla tabeli porównawczej: LED normalizujemy do stabilnych nazw,
    // żeby "LED Komplett" w Premium nie wyglądał jak BRAK "LED Spots" z Komfortu
    // (frontend porównuje featury po dokładnej nazwie).
    const features: any[] = [];
    for (const i of (pkg.items || [])) {
      if (i.category === 'led') {
        features.push({ name: 'LED-Beleuchtung', included: true, highlight: true });
        if (/stripes|somfy|komplett/i.test(i.name)) {
          features.push({ name: 'LED Stripes + Somfy Smart-Steuerung', included: true, highlight: true });
        }
      } else {
        features.push({ name: i.name, included: true, highlight: i.category !== 'roof' });
      }
    }

    return {
      id: `${pkg.id}-${Date.now()}`,
      tier: pkg.id,
      label: pkg.nameDE,
      tagline: pkg.subtitleDE,
      modelName,
      // PDF (/print/offer/:token?variant=N) czyta modelId + pricing.basePrice —
      // bez nich drukowal dokument bez nazwy modelu i bez pozycji produktowej
      modelId: modelName,
      modelDescription: pkg.descriptionDE,
      dimensions: `${widthNum} × ${depthNum} mm`,
      width: widthNum,
      projection: depthNum,
      color: ctx.color || 'RAL 7016',
      // Flat-dachy (Skystyle/Cube) są szklane mimo braku 'Glas' w nazwie
      roofType: (/glas/i.test(roofName) || /flachdach|sky/i.test(roofName)) ? 'glass' : 'poly',
      supplier: 'live_configurator',
      features,
      customerPositions: (pkg.items || []).map((i: any) => ({
        name: i.name,
        included: true,
        dimensions: i.dimensions || undefined,
        category: i.category || undefined,
        quantity: i.quantity || 1,
        note: i.note || undefined,
      })),
      structuralDetails: pkg.structuralDetails || [],
      highlights: pkg.highlights || [],
      purchaseBreakdown: (pkg.items || []).map((i: any) => ({
        position: i.name, ekEUR: i.purchaseNetto, category: i.category, supplier: i.supplier,
      })),
      purchasePriceEUR: pkg.purchaseNetto,
      priceNetEUR: pkg.customerNetto,
      priceGrossEUR: pkg.customerBrutto,
      totalNetEUR: pkg.customerNetto + INSTALLATION_COST_EUR,
      totalGrossEUR: Math.round((pkg.customerNetto + INSTALLATION_COST_EUR) * 1.19),
      installationCostEUR: INSTALLATION_COST_EUR,
      installationDays: INSTALLATION_DAYS,
      marginEUR: pkg.marginAmount,
      marginPercent: pkg.marginPercent,
      overallConfidence: pkg.overallConfidence,
      pricing: {
        basePrice: pkg.customerNetto,
        sellingPriceNet: pkg.customerNetto + INSTALLATION_COST_EUR,
        sellingPriceGross: Math.round((pkg.customerNetto + INSTALLATION_COST_EUR) * 1.19),
        installationCosts: { totalInstallation: INSTALLATION_COST_EUR, installationDays: INSTALLATION_DAYS },
        currency: 'EUR',
      },
    };
  });
}

/** Map orchestrator cross-sell items → offers.cross_sell rows */
function buildCrossSellRows(crossSell: any[]): any[] {
  return (crossSell || []).map((cs: any) => ({
    name: cs.name,
    nameDE: cs.nameDE,
    category: cs.category,
    supplier: cs.supplier,
    purchaseNetto: cs.purchaseNetto,
    customerBrutto: cs.customerBrutto,
    dimensions: cs.dimensions,
    description: cs.description,
    icon: cs.icon,
    confidence: cs.confidence,
    source: cs.source,
  }));
}

// ============================================================================
// Price request handler (simple, no queue needed)
// ============================================================================

async function handlePriceRequest(body: any): Promise<any> {
  const { productLine, width, depth, color, postHeight, freestanding, glassType, slideDirection } = body;
  
  if (!productLine || !width || !depth) {
    return { error: 'Missing required fields: productLine, width, depth' };
  }
  
  if (!PRODUCT_LINE_MAP[productLine as keyof typeof PRODUCT_LINE_MAP]) {
    return { error: `Unknown product: ${productLine}. Available: ${Object.keys(PRODUCT_LINE_MAP).join(', ')}` };
  }

  const request: PriceRequest = {
    productLine: productLine as keyof typeof PRODUCT_LINE_MAP,
    width: parseInt(width),
    depth: parseInt(depth),
    color: color || '7016',
    postHeight: postHeight || '2400',
    freestanding: freestanding === true || freestanding === 'true',
    glassType,
    slideDirection,
  };

  requestCount++;
  log(`📥 #${requestCount} ${productLine} ${width}×${depth} ${color || '7016'}`);
  
  const result = await service.getPrice(request);
  
  if (result.success) {
    log(`✅ #${requestCount} ${formatEUR(result.aluxeNetPrice!)} → ${formatEUR(result.pricing!.customerGrossPrice)} (${(result.durationMs/1000).toFixed(1)}s)`);
  } else {
    log(`❌ #${requestCount} ${result.error}`);
  }
  
  return result;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🏗️  Polendach24 Pricing Worker v4 — mit Warteschlange   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Port:     ${PORT}`);
  console.log(`  Endpoint: POST http://localhost:${PORT}/api/price`);
  console.log(`  Agent:    POST http://localhost:${PORT}/api/offer-agent`);
  console.log(`  Queue:    GET  http://localhost:${PORT}/queue`);
  console.log(`  Health:   GET  http://localhost:${PORT}/health`);
  console.log(`  Products: GET  http://localhost:${PORT}/products`);
  console.log(`  Mode:     SEQUENTIAL (max 1 offer-agent at a time)`);
  console.log();

  // Initialize service
  service = new AluxePricingService({
    username: process.env.ALUXE_USERNAME || 'Polendach24',
    password: process.env.ALUXE_PASSWORD || '',
  });

  // Pre-warm the session
  log('🔑 Pre-warming Aluxe session...');
  await service.init();
  log('✅ Ready to serve prices!');
  log(`📖 KB: ${kb.getSummary().priceRecords} price records, ${kb.getSummary().patterns} error patterns\n`);

  // ── Periodic Health Check (every 6 hours) ──
  const HEALTH_INTERVAL = 6 * 60 * 60 * 1000; // 6h
  async function runHealthCheck() {
    log('🏥 Running periodic health check...');
    const start = Date.now();
    try {
      const result = await service.getPrice({
        productLine: 'trendstyle_poly',
        width: 5000, depth: 3500, color: '7016',
      });
      const dur = Date.now() - start;
      
      kb.recordHealthCheck({
        supplier: 'aluxe',
        product: 'trendstyle_poly',
        timestamp: new Date().toISOString(),
        success: result.success,
        priceEUR: result.aluxeNetPrice || 0,
        durationMs: dur,
        error: result.error,
      });

      if (result.success && result.aluxeNetPrice) {
        // Check for anomaly vs history
        const anomaly = kb.checkPriceAnomaly('aluxe', 'trendstyle_poly', 5000, 3500, result.aluxeNetPrice);
        if (anomaly.isAnomaly) {
          log(`⚠️ 🏥 HEALTH ANOMALY: Aluxe Trendstyle 5000×3500 = ${result.aluxeNetPrice.toFixed(0)}€ — ${anomaly.reason}`);
        } else {
          log(`✅ 🏥 Health OK: Aluxe ${result.aluxeNetPrice.toFixed(0)}€ (${(dur/1000).toFixed(1)}s)${anomaly.historicalAvg ? ` avg=${anomaly.historicalAvg.toFixed(0)}€` : ''}`);
        }
      } else {
        log(`❌ 🏥 Health FAIL: Aluxe — ${result.error}`);
      }
      kb.save();
    } catch (e) {
      log(`❌ 🏥 Health check error: ${(e as Error).message}`);
    }
  }
  
  // Run first health check after 60s (let system warm up)
  setTimeout(runHealthCheck, 60_000);
  setInterval(runHealthCheck, HEALTH_INTERVAL);

  // ── Stuck Offer Recovery — retry pricing_pending offers ──
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const STUCK_CHECK_INTERVAL = 10 * 60 * 1000; // 10 min
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 min = considered stuck

  async function recoverStuckOffers() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      log('⚠️ Recovery skipped: no Supabase credentials in env');
      return;
    }
    try {
      // Find offers stuck in pricing_pending for > 5 minutes
      const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/offers?status=eq.pricing_pending&created_at=lt.${cutoff}&select=id,offer_number,public_token,lead_id,product_config,customer_data&order=created_at.asc&limit=5`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const stuck: any[] = await res.json();
      if (!Array.isArray(stuck) || stuck.length === 0) return;

      log(`🔄 Found ${stuck.length} stuck offer(s) in pricing_pending — retrying...`);

      for (const offer of stuck) {
        const pc = offer.product_config || {};
        const cd = offer.customer_data || {};

        // Skip if already in queue
        if (offerQueue.isProcessing || offerQueue.length > 0) {
          log(`  ⏳ ${offer.offer_number} — queue busy, will retry next cycle`);
          break;
        }

        const width = pc.width;
        const depth = pc.projection || pc.depth;
        if (!width || !depth) {
          log(`  ⚠️ ${offer.offer_number} — missing dimensions, marking as failed`);
          await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${offer.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              status: 'pricing_failed',
              pricing: { status: 'failed', error: 'Missing dimensions for retry' },
            }),
          });
          continue;
        }

        log(`  🔄 Retrying ${offer.offer_number}: ${width}×${depth}mm`);

        const request: BotPricingRequest = {
          leadId: offer.lead_id,
          customerName: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Retry',
          width: parseInt(width),
          depth: parseInt(depth),
          height: pc.height ? parseInt(pc.height) : undefined,
          color: (pc.color || '7016').replace('RAL ', ''),
          // Zawsze wyceniaj oba pokrycia — życzenie klienta steruje pakietami
          roofType: 'both',
          customerPreferredCover: pc.roofTypeExplicit ? pc.roofType : undefined,
          freestanding: pc.installationType === 'freestanding',
          requestedExtras: Array.isArray(pc.requestedExtras) ? pc.requestedExtras : undefined,
          postalCode: cd.postalCode || cd.plz || '',
          productCategory: pc.productCategory,
          primaryModelId: pc.modelId,
          wantsWintergarten: pc.wantsWintergarten === true,
        };

        try {
          const queuedPromise = offerQueue.enqueue(request);
          const result = await queuedPromise;

          // Save results back — SAME variant shape as the normal flow
          const variants = buildVariantsFromPackages(result.packages, { width, depth, color: pc.color });
          if (variants.length === 0) {
            // trafi do catch poniżej → offer oznaczony jako pricing_failed
            throw new Error('No publishable packages (all roof prices missing)');
          }
          const recommended = variants.find((v: any) => v.tier === 'recommended') || variants[1] || variants[0];

          await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${offer.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              status: 'sent',
              variants,
              cross_sell: buildCrossSellRows(result.crossSell),
              pricing: {
                status: 'completed',
                currency: 'EUR',
                totalCost: recommended?.priceGrossEUR || 0,
                basePrice: recommended?.priceNetEUR || 0,
                sellingPriceNet: recommended?.totalNetEUR || 0,
                sellingPriceGross: recommended?.totalGrossEUR || 0,
                purchasePriceNet: recommended?.purchasePriceEUR || 0,
                marginEUR: recommended?.marginEUR || 0,
                marginPercent: recommended?.marginPercent || 0,
                installationCosts: { totalInstallation: INSTALLATION_COST_EUR, installationDays: INSTALLATION_DAYS },
                completedAt: new Date().toISOString(),
                source: 'retry',
              },
              product_config: {
                ...pc,
                pricingSource: 'live_configurator',
                retriedAt: new Date().toISOString(),
              },
            }),
          });

          // Update lead status
          if (offer.lead_id) {
            await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${offer.lead_id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                status: 'offer_agent_sent',
                updated_at: new Date().toISOString(),
              }),
            });
          }

          // Send email if customer has email
          const customerEmail = cd.email;
          if (customerEmail) {
            try {
              await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'apikey': SUPABASE_KEY,
                },
                body: JSON.stringify({
                  to: customerEmail,
                  subject: `Ihr persönliches Angebot ${offer.offer_number} ist fertig!`,
                  html: `<p>Guten Tag,</p><p>Ihr Angebot ist nun verfügbar:</p><p><a href="https://polendach24.app/p/offer/${offer.public_token}">Angebot ansehen</a></p><p>Ihr Polendach24-Team</p>`,
                  fromName: 'Polendach24',
                }),
              });
              log(`  📧 Retry email sent to ${customerEmail}`);
            } catch { /* email is best-effort */ }
          }

          log(`  ✅ ${offer.offer_number} recovered successfully!`);
        } catch (retryErr) {
          log(`  ❌ ${offer.offer_number} retry failed: ${(retryErr as Error).message}`);
          // Mark as failed so we don't retry forever
          await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${offer.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              status: 'pricing_failed',
              pricing: { status: 'failed', error: (retryErr as Error).message, failedAt: new Date().toISOString() },
            }),
          });
        }
      }
    } catch (e) {
      log(`⚠️ Recovery check error: ${(e as Error).message}`);
    }
  }

  // Run recovery after 30s warmup, then every 10 min
  setTimeout(recoverStuckOffers, 30_000);
  setInterval(recoverStuckOffers, STUCK_CHECK_INTERVAL);

  // HTTP Server
  const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth check (skip for health and queue)
    const authHeader = req.headers.authorization;
    if (req.url !== '/health' && req.url !== '/queue' && authHeader !== `Bearer ${API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      // ── Health ──
      if (req.url === '/health' && req.method === 'GET') {
        const supplierHealth = kb.getAllSupplierHealth();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          session: service.isSessionActive() ? 'active' : 'expired',
          requests: requestCount,
          uptime: process.uptime(),
          queue: offerQueue.stats,
          kb: kb.getSummary(),
          suppliers: Object.values(supplierHealth).map(s => ({
            name: s.supplier, status: s.status,
            successRate: s.successRate30d,
            lastCheck: s.lastCheck,
            refPrice: s.referencePrice,
          })),
        }));
        return;
      }

      // ── KB Summary ──
      if (req.url === '/kb/summary' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(kb.getSummary(), null, 2));
        return;
      }

      // ── KB Health per supplier ──
      if (req.url === '/kb/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(kb.getAllSupplierHealth(), null, 2));
        return;
      }

      // ── KB Price Estimate (fallback) ──
      if (req.url === '/kb/estimate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { supplier, product, width, depth } = JSON.parse(body);
            const estimate = kb.estimatePrice(supplier, product, width, depth);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(estimate || { error: 'Not enough data to estimate' }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        });
        return;
      }

      // ── Queue status ──
      if (req.url === '/queue' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(offerQueue.stats, null, 2));
        return;
      }

      // ── Products ──
      if (req.url === '/products' && req.method === 'GET') {
        const products = Object.keys(PRODUCT_LINE_MAP).map(key => ({
          key,
          productId: PRODUCT_LINE_MAP[key as keyof typeof PRODUCT_LINE_MAP],
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ products }));
        return;
      }

      // ── Single price ──
      if (req.url === '/api/price' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body);
            const result = await handlePriceRequest(parsed);
            res.writeHead(result.error && !result.success ? 400 : 200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        });
        return;
      }

      // ── Batch pricing ──
      if (req.url === '/api/price/batch' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { configs } = JSON.parse(body);
            if (!Array.isArray(configs)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'configs must be an array' }));
              return;
            }
            const results = [];
            for (const config of configs) {
              results.push(await handlePriceRequest(config));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ results }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        });
        return;
      }

      // ══════════════════════════════════════════════════════════
      // OFFER AGENT — With QUEUE + SUPABASE CALLBACK
      // ══════════════════════════════════════════════════════════
      if (req.url === '/api/offer-agent' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body);
            const { customerName, width, depth, height, color, roofType, postalCode, leadId,
                    offerId, offerNumber, publicToken, customerEmail, customerPhone,
                    supabaseUrl, supabaseServiceKey, productCategory, primaryModelId, wantsWintergarten,
                    customerPreferredCover, freestanding, requestedExtras } = parsed;

            if (!width || !depth) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required: width, depth' }));
              return;
            }

            const request: BotPricingRequest = {
              leadId,
              customerName: customerName || 'Kunde',
              width: parseInt(width),
              depth: parseInt(depth),
              height: height ? parseInt(height) : undefined,
              color: color || '7016',
              roofType: roofType || 'both',
              postalCode,
              productCategory,
              primaryModelId,
              wantsWintergarten: wantsWintergarten === true,
              // Życzenia klienta — sterują pakietem "Empfohlen" (i Basis przy jawnym pokryciu)
              customerPreferredCover: customerPreferredCover || undefined,
              freestanding: freestanding === true,
              requestedExtras: Array.isArray(requestedExtras) ? requestedExtras : undefined,
            };
            if (customerPreferredCover || freestanding || (requestedExtras || []).length > 0) {
              log(`🎯 Kunden-Wünsche: Eindeckung=${customerPreferredCover || '-'}, freistehend=${freestanding === true}, Extras=[${(requestedExtras || []).join(', ')}]`);
            }

            // Respond IMMEDIATELY — pricing runs in background
            res.writeHead(202, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              status: 'queued', 
              position: offerQueue.length + (offerQueue.isProcessing ? 1 : 0) + 1,
              message: 'Pricing queued. Will save to Supabase when done.',
            }));

            // Enqueue and process
            try {
              const queuedPromise = offerQueue.enqueue(request);
              const result = await queuedPromise;

              // ── CALLBACK: Save results to Supabase ──
              if (supabaseUrl && supabaseServiceKey && offerId) {
                log(`💾 Saving pricing to Supabase offer ${offerId}...`);
                
                try {
                  // Build variants from worker result — shared shape with recovery path
                  const variants = buildVariantsFromPackages(result.packages, { width, depth, color });
                  if (variants.length === 0) {
                    // Żaden pakiet nie ma wycenionego dachu → NIE publikujemy pustej oferty
                    log(`❌ Keine veröffentlichbaren Pakete (alle Dach-Preise fehlen) — Offer → pricing_failed`);
                    await fetch(`${supabaseUrl}/rest/v1/offers?id=eq.${offerId}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Prefer': 'return=minimal',
                      },
                      body: JSON.stringify({
                        status: 'pricing_failed',
                        pricing: { status: 'failed', error: 'No roof prices from any supplier', failedAt: new Date().toISOString() },
                        updated_at: new Date().toISOString(),
                      }),
                    }).catch(() => {});
                    // Lead nie może wisieć w "wycena trwa" — oznacz do ręcznej obsługi
                    if (leadId) {
                      await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${leadId}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'apikey': supabaseServiceKey,
                          'Authorization': `Bearer ${supabaseServiceKey}`,
                          'Prefer': 'return=minimal',
                        },
                        body: JSON.stringify({ status: 'needs_info', updated_at: new Date().toISOString() }),
                      }).catch(() => {});
                    }
                    return;
                  }
                  const recommended = variants.find((v: any) => v.tier === 'recommended') || variants[1] || variants[0];

                  // Update offer
                  const updateRes = await fetch(`${supabaseUrl}/rest/v1/offers?id=eq.${offerId}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseServiceKey,
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({
                      variants,
                      pricing: {
                        status: 'completed',
                        totalCost: recommended?.priceGrossEUR || 0,
                        sellingPriceNet: recommended?.totalNetEUR || 0,
                        sellingPriceGross: recommended?.totalGrossEUR || 0,
                        marginPercentage: recommended?.marginPercent || 0,
                        basePrice: recommended?.priceNetEUR || 0,
                        installationCosts: { totalInstallation: INSTALLATION_COST_EUR, installationDays: INSTALLATION_DAYS },
                        currency: 'EUR',
                      },
                      // Cross-sell items (markise, panorama side, ZIP screens, Richtpreis extras)
                      cross_sell: buildCrossSellRows(result.crossSell),
                      margin_percentage: recommended?.marginPercent || 40,
                      status: 'sent',
                      updated_at: new Date().toISOString(),
                    }),
                  });
                  
                  if (updateRes.ok) {
                    log(`✅ Offer ${offerNumber} updated in Supabase with ${variants.length} variants`);
                  } else {
                    log(`❌ Supabase update failed: ${updateRes.status} ${await updateRes.text()}`);
                  }

                  // ── Save FULL EK pricing details to lead ──
                  const pricingDetails = {
                    generatedAt: new Date().toISOString(),
                    dimensions: `${width}×${depth}mm`,
                    color: color || 'RAL 7016',
                    productCategory: productCategory || 'roof',
                    suppliersUsed: result.liveQuotes
                      .filter((q: any) => q.success)
                      .map((q: any) => q.supplier)
                      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
                    // Linki do zapisanych ofert zakupowych u dostawcow (Aluxe Offerte)
                    supplierOrders: result.supplierOrders || [],
                    totalQuotes: result.liveQuotes.length,
                    successfulQuotes: result.liveQuotes.filter((q: any) => q.success).length,
                    durationSeconds: Math.round(result.totalDurationMs / 1000),
                    
                    // All live EK quotes per supplier
                    liveQuotes: result.liveQuotes.map((q: any) => ({
                      supplier: q.supplier,
                      product: q.product,
                      productLabel: q.productLabel,
                      category: q.category,
                      priceEK: q.price ? Math.round(q.price) : null,
                      success: q.success,
                      error: q.error || null,
                      source: q.source,
                      confidence: q.confidence,
                    })),
                    
                    // Package breakdown: EK, margin, VK per tier
                    packages: result.packages.map((pkg: any) => ({
                      tier: pkg.id,
                      name: pkg.nameDE,
                      purchaseEK: Math.round(pkg.purchaseNetto),
                      marginAmount: Math.round(pkg.marginAmount),
                      marginPercent: Math.round(pkg.marginPercent),
                      customerNetto: Math.round(pkg.customerNetto),
                      customerBrutto: Math.round(pkg.customerBrutto),
                      items: (pkg.items || []).map((i: any) => ({
                        name: i.name,
                        category: i.category,
                        supplier: i.supplier,
                        ekNetto: Math.round(i.purchaseNetto || 0),
                        quantity: i.quantity || 1,
                      })),
                    })),
                    
                    // Cross-sell options with EK
                    crossSell: (result.crossSell || []).map((cs: any) => ({
                      name: cs.nameDE || cs.name,
                      category: cs.category,
                      purchaseEK: Math.round(cs.purchaseNetto || 0),
                      customerBrutto: Math.round(cs.customerBrutto || 0),
                      supplier: cs.supplier,
                    })),
                  };

                  // Update lead with status + full pricing details
                  const leadUpdateRes = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${leadId}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseServiceKey,
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({
                      status: 'offer_agent_sent',
                      pricing_details: pricingDetails,
                      updated_at: new Date().toISOString(),
                    }),
                  });
                  if (leadUpdateRes.ok) {
                    log(`✅ Lead ${leadId} updated: status=offer_agent_sent + ${pricingDetails.liveQuotes.length} EK quotes saved`);
                  } else {
                    // pricing_details column might not exist — try without it
                    log(`⚠️ Lead update with pricing_details failed (${leadUpdateRes.status}), trying without...`);
                    await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${leadId}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Prefer': 'return=minimal',
                      },
                      body: JSON.stringify({
                        status: 'offer_agent_sent',
                        updated_at: new Date().toISOString(),
                      }),
                    });
                    log(`✅ Lead ${leadId} status → offer_agent_sent (without pricing_details)`);
                  }

                  // ── Send professional email ──
                  if (customerEmail) {
                    try {
                      const appUrl = 'https://polendach24.app';
                      const offerUrl = `${appUrl}/p/offer/${publicToken}`;
                      const modelName = recommended?.modelName || 'Terrassendach';
                      // ab/bis liczone z min/max, nie z pozycji w tablicy (kolejność push ≠ kolejność cen)
                      const grossPrices = variants.map((v: any) => v.totalGrossEUR).filter((p: number) => p > 0);
                      const basisPrice = grossPrices.length > 0 ? `ab ${Math.min(...grossPrices).toLocaleString('de-DE')}€` : '';
                      const premiumPrice = grossPrices.length > 1 ? `bis ${Math.max(...grossPrices).toLocaleString('de-DE')}€` : '';
                      
                      const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f5;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  
  <!-- Logo on subtle gray bg -->
  <tr><td style="background:#f4f6f8;padding:24px 40px 20px;text-align:center;border-bottom:2px solid #e2e8f0;">
    <img src="https://polendach24.app/PolenDach24-Logo.png" alt="Polendach24" width="180" style="max-width:180px;height:auto;display:inline-block;" />
  </td></tr>

  <!-- Hero Header -->
  <tr><td style="background:#1e293b;padding:36px 40px 30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Ihr pers&#246;nliches Angebot</h1>
    <p style="color:#7dd3fc;margin:10px 0 0;font-size:15px;">${modelName} &#8212; ${width} &#215; ${depth} mm</p>
  </td></tr>

  <!-- Product Image -->
  <tr><td style="padding:0;line-height:0;font-size:0;">
    <img src="https://polendach24.app/images/models/trendline-panorama.webp" alt="${modelName}" width="600" style="width:100%;max-width:600px;height:auto;display:block;" />
  </td></tr>
  
  <!-- Body text -->
  <tr><td style="padding:36px 40px 24px;">
    <p style="color:#1e293b;font-size:16px;line-height:1.7;margin:0 0 18px;">Guten Tag,</p>
    <p style="color:#334155;font-size:16px;line-height:1.7;margin:0 0 24px;">vielen Dank f&#252;r Ihr Interesse an einer hochwertigen Terrassen&#252;berdachung aus Aluminium. Wir haben <strong>${variants.length} individuelle Varianten</strong> f&#252;r Sie zusammengestellt &#8212; von der Economy- bis zur Premium-Ausstattung.</p>
    
    <!-- Price Range Box -->
    ${basisPrice ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr><td style="background:#f1f5f9;padding:22px 28px;border-left:4px solid #1e40af;">
        <p style="color:#64748b;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">PREISRAHMEN INKL. MONTAGE</p>
        <p style="color:#0f172a;font-size:24px;font-weight:800;margin:0;">${basisPrice}${premiumPrice ? ` &#8212; ${premiumPrice}` : ''}</p>
        <p style="color:#64748b;font-size:12px;margin:6px 0 0;">Brutto inkl. 19% MwSt. und professioneller Montage</p>
      </td></tr>
    </table>
    ` : ''}
    
    <!-- Primary CTA: View Offer -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" style="padding:4px 0 16px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${offerUrl}" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="15%" fillcolor="#1e40af">
        <center style="color:#ffffff;font-family:Arial;font-size:17px;font-weight:bold;">Angebot jetzt ansehen &#8594;</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!--><a href="${offerUrl}" style="background-color:#1e40af;color:#ffffff;padding:18px 48px;border-radius:8px;text-decoration:none;font-weight:700;font-size:17px;display:inline-block;">Angebot jetzt ansehen &#8594;</a><!--<![endif]-->
      </td></tr>
    </table>
    <p style="text-align:center;color:#64748b;font-size:12px;margin:0 0 8px;">Vergleichen Sie alle Varianten interaktiv und unverbindlich</p>
  </td></tr>

  <!-- 3 USP Badges -->
  <tr><td style="padding:0 32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="8" border="0">
      <tr>
        <td width="33%" align="center" valign="top" style="background:#f0fdf4;padding:20px 10px;border:1px solid #bbf7d0;">
          <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" style="background:#16a34a;width:36px;height:36px;color:#ffffff;font-size:18px;font-weight:700;">&#10003;</td></tr></table>
          <p style="color:#166534;font-size:13px;font-weight:700;margin:10px 0 0;line-height:1.4;">Kostenloses<br/>Aufma&#223;</p>
        </td>
        <td width="33%" align="center" valign="top" style="background:#eff6ff;padding:20px 10px;border:1px solid #bfdbfe;">
          <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" style="background:#2563eb;width:36px;height:36px;color:#ffffff;font-size:18px;font-weight:700;">&#10003;</td></tr></table>
          <p style="color:#1e40af;font-size:13px;font-weight:700;margin:10px 0 0;line-height:1.4;">Profilmuster<br/>vor Ort</p>
        </td>
        <td width="33%" align="center" valign="top" style="background:#fefce8;padding:20px 10px;border:1px solid #fde68a;">
          <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" style="background:#d97706;width:36px;height:36px;color:#ffffff;font-size:18px;font-weight:700;">&#10003;</td></tr></table>
          <p style="color:#92400e;font-size:13px;font-weight:700;margin:10px 0 0;line-height:1.4;">Professionelle<br/>Montage</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Next Steps / Consultation CTA -->
  <tr><td style="background:#f0fdf4;padding:28px 40px;border-top:2px solid #bbf7d0;border-bottom:2px solid #bbf7d0;">
    <p style="color:#166534;font-size:18px;font-weight:700;margin:0 0 12px;">Ihr n&#228;chster Schritt: Kostenloser Beratungstermin</p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">Gerne kommen wir <strong>kostenlos und unverbindlich</strong> zu Ihnen vor Ort, um:</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">1.</span> &#160; Exaktes Aufma&#223; Ihrer Terrasse zu nehmen</td></tr>
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">2.</span> &#160; Ihnen unsere <strong>Aluminium-Profile</strong> zum Anfassen zu zeigen</td></tr>
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">3.</span> &#160; Alle Details und Ihre W&#252;nsche pers&#246;nlich zu besprechen</td></tr>
      <tr><td style="padding:5px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">4.</span> &#160; Ein <strong>ma&#223;geschneidertes Angebot</strong> mit Festpreis zu erstellen</td></tr>
    </table>
    
    <!-- Green CTA: Book Appointment -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
      <tr><td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="tel:+4915888649130" style="height:54px;v-text-anchor:middle;width:340px;" arcsize="15%" fillcolor="#16a34a">
        <center style="color:#ffffff;font-family:Arial;font-size:16px;font-weight:bold;">Jetzt Termin vereinbaren: anrufen</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!--><a href="tel:+4915888649130" style="background-color:#16a34a;color:#ffffff;padding:16px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">&#9742; Jetzt anrufen: +49 1588 8649130</a><!--<![endif]-->
      </td></tr>
      <tr><td align="center" style="padding:8px 0 0;">
        <p style="color:#166534;font-size:12px;margin:0;font-weight:600;">Kostenlos &#8226; Unverbindlich &#8226; Ohne Wartezeit</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- What you get in the offer -->
  <tr><td style="padding:28px 40px;">
    <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 14px;">In Ihrem interaktiven Angebot:</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; ${variants.length} Varianten im direkten Vergleich</td></tr>
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; Zusatzoptionen: Markisen, Schiebet&#252;ren, Beleuchtung</td></tr>
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; Alle Preise transparent und verst&#228;ndlich</td></tr>
      <tr><td style="padding:7px 0;color:#334155;font-size:14px;"><span style="color:#16a34a;font-weight:700;">&#10003;</span> &#160; Direkte Kontaktaufnahme per Telefon oder E-Mail</td></tr>
    </table>
  </td></tr>

  <!-- Trust section -->
  <tr><td style="background:#f8fafc;padding:28px 40px;border-top:2px solid #e2e8f0;">
    <p style="color:#1e293b;font-size:15px;font-weight:700;margin:0 0 14px;">Warum Polendach24?</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="50%" style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Deutsche Qualit&#228;tsstandards</td>
        <td width="50%" style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Eigene Montageteams</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> 10 Jahre Garantie</td>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Beratung bei Ihnen vor Ort</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Profilmuster zum Anfassen</td>
        <td style="padding:5px 0;color:#475569;font-size:13px;"><span style="color:#1e40af;font-weight:700;">&#9679;</span> Montage in 1&#8211;2 Tagen</td>
      </tr>
    </table>
  </td></tr>

  <!-- Sales Team Section -->
  <tr><td style="padding:28px 40px;border-top:2px solid #e2e8f0;">
    <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 16px;">Ihre Ansprechpartner</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="33%" valign="top" style="padding:8px 6px 8px 0;">
          <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 4px;">Mike Ledwin</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;">Vertriebsberater</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;"><a href="tel:+4915257487430" style="color:#1e40af;text-decoration:none;">+49 152 57487430</a></p>
          <p style="margin:0;"><a href="mailto:m.ledwin@polendach24.de" style="color:#1e40af;text-decoration:none;font-size:11px;">m.ledwin@polendach24.de</a></p>
        </td>
        <td width="33%" valign="top" style="padding:8px 6px;">
          <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 4px;">Hubert Ko&#347;ci&#243;w</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;">Vertriebsberater</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;"><a href="tel:+4915223634823" style="color:#1e40af;text-decoration:none;">+49 152 23634823</a></p>
          <p style="margin:0;"><a href="mailto:h.kosciow@polendach24.de" style="color:#1e40af;text-decoration:none;font-size:11px;">h.kosciow@polendach24.de</a></p>
        </td>
        <td width="33%" valign="top" style="padding:8px 0 8px 6px;">
          <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 4px;">Oliwia Du&#378;</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;">Vertriebsberaterin</p>
          <p style="color:#475569;font-size:12px;margin:0 0 2px;"><a href="tel:+491626692445" style="color:#1e40af;text-decoration:none;">+49 162 6692445</a></p>
          <p style="margin:0;"><a href="mailto:o.duz@polendach24.de" style="color:#1e40af;text-decoration:none;font-size:11px;">o.duz@polendach24.de</a></p>
        </td>
      </tr>
    </table>
    <p style="color:#64748b;font-size:12px;margin:14px 0 0;">Rufen Sie einfach an oder schreiben Sie uns &#8212; wir melden uns umgehend!</p>
  </td></tr>

  <!-- Dark Footer -->
  <tr><td style="background:#0f172a;padding:24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <p style="color:#ffffff;font-size:15px;font-weight:700;margin:0 0 2px;">Polendach24</p>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Ihr Partner f&#252;r hochwertige Terrassen&#252;berdachungen</p>
        </td>
        <td align="right" valign="middle">
          <a href="tel:+4915888649130" style="color:#7dd3fc;text-decoration:none;font-size:13px;">+49 1588 8649130</a><br/>
          <a href="mailto:buero@polendach24.de" style="color:#7dd3fc;text-decoration:none;font-size:12px;">buero@polendach24.de</a>
        </td>
      </tr>
    </table>
  </td></tr>
  
</table>
<p style="text-align:center;color:#94a3b8;font-size:11px;margin:16px 0 0;">&#169; ${new Date().getFullYear()} Polendach24 | Diese E-Mail wurde automatisch erstellt.</p>
</td></tr>
</table>
</body></html>`;
                      
                      const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${supabaseServiceKey}`,
                          'apikey': supabaseServiceKey,
                        },
                        body: JSON.stringify({
                          to: customerEmail,
                          subject: `Ihr persönliches Angebot ${offerNumber} — ${modelName} ${basisPrice}`,
                          html: emailHtml,
                          fromName: 'Polendach24',
                        }),
                      });
                      const emailResult = await emailRes.json().catch(() => ({}));
                      if (emailRes.ok) {
                        log(`📧 Email sent to ${customerEmail} (${emailRes.status})`);
                        // Zapisz e-mail agenta w historii leada (oś "Kommunikation")
                        if (leadId) {
                          await fetch(`${supabaseUrl}/rest/v1/customer_communications`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': supabaseServiceKey,
                              'Authorization': `Bearer ${supabaseServiceKey}`,
                              'Prefer': 'return=minimal',
                            },
                            body: JSON.stringify({
                              lead_id: leadId,
                              type: 'email',
                              direction: 'outbound',
                              subject: `Ihr persönliches Angebot ${offerNumber} — ${modelName} ${basisPrice}`,
                              content: `[Agent] E-Mail mit Angebot ${offerNumber} an ${customerEmail} — https://polendach24.app/p/offer/${publicToken}`,
                              date: new Date().toISOString(),
                              metadata: { source: 'offer_agent', offerNumber, publicToken },
                            }),
                          }).catch(() => {});
                        }
                      } else {
                        log(`❌ Email failed (${emailRes.status}): ${JSON.stringify(emailResult).substring(0, 200)}`);
                      }
                    } catch (emailErr) {
                      log(`❌ Email error: ${(emailErr as Error).message}`);
                    }
                  }

                  // ── Send SMS notification ──
                  if (customerPhone && supabaseUrl && supabaseServiceKey) {
                    try {
                      const smsBody = `Guten Tag, Ihr persönliches Angebot für eine Terrassenüberdachung (${width}x${depth}mm) ist fertig! ${customerEmail ? 'Wir haben es Ihnen per E-Mail zugeschickt.' : ''} Sie können es hier ansehen: https://polendach24.app/p/offer/${publicToken} — Bei Fragen: +49 1588 8649130. Ihr Polendach24-Team`;
                      
                      const smsRes = await fetch(`${supabaseUrl}/functions/v1/twilio-sms`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${supabaseServiceKey}`,
                          'apikey': supabaseServiceKey,
                        },
                        body: JSON.stringify({
                          to: customerPhone,
                          body: smsBody,
                          channel: 'sms',
                          leadId: leadId || undefined,
                        }),
                      });
                      const smsResult = await smsRes.json();
                      if (smsResult.success) {
                        log(`📱 SMS sent to ${customerPhone}`);
                      } else {
                        log(`⚠️ SMS response: ${JSON.stringify(smsResult)}`);
                      }
                    } catch (smsErr) {
                      log(`❌ SMS failed: ${(smsErr as Error).message}`);
                    }
                  }

                } catch (saveErr) {
                  log(`❌ Supabase save error: ${(saveErr as Error).message}`);
                }
              }
            } catch (err) {
              log(`❌ Pricing failed for ${customerName}: ${(err as Error).message}`);
              // Update offer status to error
              if (supabaseUrl && supabaseServiceKey && offerId) {
                await fetch(`${supabaseUrl}/rest/v1/offers?id=eq.${offerId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Prefer': 'return=minimal',
                  },
                  body: JSON.stringify({ status: 'pricing_error', updated_at: new Date().toISOString() }),
                }).catch(() => {});
                if (leadId) {
                  await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${leadId}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseServiceKey,
                      'Authorization': `Bearer ${supabaseServiceKey}`,
                      'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({ status: 'needs_info', updated_at: new Date().toISOString() }),
                  }).catch(() => {});
                }
              }
            }
          } catch (err) {
            log(`❌ OFFER-AGENT parse error: ${(err as Error).message}`);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: (err as Error).message }));
            }
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  });

  server.listen(PORT, () => {
    log(`🚀 Server listening on port ${PORT}`);
    log(`\nExample curl:`);
    log(`curl -X POST http://localhost:${PORT}/api/price \\`);
    log(`  -H "Content-Type: application/json" \\`);
    log(`  -H "Authorization: Bearer ${API_KEY}" \\`);
    log(`  -d '{"productLine":"trendstyle_poly","width":5000,"depth":3500}'`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    log('🛑 Shutting down...');
    await service.close();
    server.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await service.close();
    server.close();
    process.exit(0);
  });
}

main().catch(console.error);
