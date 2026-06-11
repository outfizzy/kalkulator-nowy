// ============================================================================
// Configurator Knowledge Base — Self-Learning System
// Layers 3 (Field Scanner), 4 (Error Recovery), 5 (Health Monitor)
//
// Learns from every configurator interaction:
//   - Field limits (min/max per product)
//   - Valid options (colors, modules, drain types)
//   - Error patterns & fix strategies
//   - Health status per supplier
// ============================================================================

import fs from 'fs';
import path from 'path';

// ── Types ──

export interface FieldDefinition {
  name: string;
  type: 'number' | 'select' | 'checkbox' | 'text';
  min?: number;
  max?: number;
  options?: string[];
  required?: boolean;
  dependsOn?: string;        // e.g., "Width1 depends on Modules"
  discoveredAt: string;       // ISO timestamp
  updatedAt: string;
  source: 'scan' | 'error_recovery' | 'manual';
}

export interface ProductKnowledge {
  productName: string;
  supplier: string;
  fields: Record<string, FieldDefinition>;
  lastScanned?: string;
  scanCount: number;
}

export interface ErrorPattern {
  id: string;
  supplier: string;
  product?: string;
  errorMessage: string;       // Regex pattern to match
  field?: string;             // Field that caused error
  fixStrategy: ErrorFixStrategy;
  description: string;
  successCount: number;       // Times this fix worked
  failCount: number;          // Times this fix didn't work
  discoveredAt: string;
  lastUsed?: string;
}

export type ErrorFixStrategy =
  | { type: 'split_modules'; maxPerModule: number }
  | { type: 'set_value'; field: string; value: any }
  | { type: 'set_first_option'; field: string }
  | { type: 'skip_field'; field: string }
  | { type: 'relogin' }
  | { type: 'retry_with_delay'; delayMs: number }
  | { type: 'clamp_value'; field: string; min?: number; max?: number }
  | { type: 'use_fallback_price' };

export interface HealthCheckResult {
  supplier: string;
  product: string;
  timestamp: string;
  success: boolean;
  priceEUR?: number;
  expectedPriceEUR?: number;
  deviation?: number;         // % deviation from expected
  durationMs: number;
  error?: string;
}

export interface SupplierHealth {
  supplier: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  lastSuccess: string;
  successRate30d: number;     // 0-100%
  avgDurationMs: number;
  recentChecks: HealthCheckResult[];
  referencePrice?: { product: string; width: number; depth: number; priceEUR: number };
}

export interface KnowledgeBase {
  version: number;
  lastUpdated: string;
  products: Record<string, ProductKnowledge>;   // key: "supplier:product"
  errorPatterns: ErrorPattern[];
  supplierHealth: Record<string, SupplierHealth>;
  priceHistory: PriceHistoryEntry[];
}

export interface PriceHistoryEntry {
  supplier: string;
  product: string;
  width: number;
  depth: number;
  height?: number;
  color?: string;
  priceNetEUR: number;
  pricePLN?: number;
  success: boolean;
  error?: string;
  durationMs: number;
  timestamp: string;
  leadId?: string;
}

// ── Default error patterns (built-in knowledge) ──

const BUILT_IN_PATTERNS: ErrorPattern[] = [
  {
    id: 'aliplast-width-max',
    supplier: 'aliplast',
    errorMessage: 'Maksymalna wartość (\\d+)',
    field: 'Width1',
    fixStrategy: { type: 'split_modules', maxPerModule: 4000 },
    description: 'Pergola Width1 max 4000mm → split into multi-module',
    successCount: 0, failCount: 0,
    discoveredAt: '2026-05-31T00:00:00Z',
  },
  {
    id: 'aliplast-legs-required',
    supplier: 'aliplast',
    errorMessage: 'Zaznacz nogi do skonfigurowania.*Pole wymagane',
    field: 'CustomizeALegs',
    fixStrategy: { type: 'set_value', field: 'CustomizeALegs', value: [] },
    description: 'CustomizeALegs requires empty array, not boolean',
    successCount: 0, failCount: 0,
    discoveredAt: '2026-05-31T00:00:00Z',
  },
  {
    id: 'aliplast-zip-width-max',
    supplier: 'aliplast',
    product: 'ZipScreen',
    errorMessage: 'Zmierzona szerokość.*MeasuredWidth',
    field: 'MeasuredWidth',
    fixStrategy: { type: 'clamp_value', field: 'MeasuredWidth', min: 500, max: 5000 },
    description: 'ZIP Screen MeasuredWidth max ~5000mm',
    successCount: 0, failCount: 0,
    discoveredAt: '2026-05-31T00:00:00Z',
  },
  {
    id: 'session-expired',
    supplier: '*',
    errorMessage: 'session.*expired|login.*required|unauthorized|niet ingelogd',
    fixStrategy: { type: 'relogin' },
    description: 'Session expired — re-login and retry',
    successCount: 0, failCount: 0,
    discoveredAt: '2026-05-31T00:00:00Z',
  },
  {
    id: 'timeout-retry',
    supplier: '*',
    errorMessage: 'timeout|ETIMEDOUT|navigation.*timeout',
    fixStrategy: { type: 'retry_with_delay', delayMs: 5000 },
    description: 'Network timeout — retry after delay',
    successCount: 0, failCount: 0,
    discoveredAt: '2026-05-31T00:00:00Z',
  },
];

// ── Knowledge Base Manager ──

export class ConfiguratorKnowledgeBase {
  private kb: KnowledgeBase;
  private filePath: string;
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  // Keep max N price history entries in memory (rest is discarded on save)
  private static MAX_HISTORY = 5000;
  // Keep max N health checks per supplier
  private static MAX_HEALTH_CHECKS = 100;

  constructor(storagePath?: string) {
    this.filePath = storagePath || path.resolve(process.cwd(), 'data', 'configurator-knowledge.json');
    this.kb = this.load();
  }

  // ── Persistence ──

  private load(): KnowledgeBase {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw) as KnowledgeBase;
        // Merge built-in patterns (keep user-discovered ones too)
        for (const bp of BUILT_IN_PATTERNS) {
          if (!data.errorPatterns.find(p => p.id === bp.id)) {
            data.errorPatterns.push(bp);
          }
        }
        console.log(`📖 KB loaded: ${Object.keys(data.products).length} products, ${data.errorPatterns.length} patterns, ${data.priceHistory.length} price records`);
        return data;
      }
    } catch (e) {
      console.warn(`⚠️ KB load error: ${(e as Error).message}`);
    }

    // Fresh knowledge base
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      products: {},
      errorPatterns: [...BUILT_IN_PATTERNS],
      supplierHealth: {},
      priceHistory: [],
    };
  }

  save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Trim history
      if (this.kb.priceHistory.length > ConfiguratorKnowledgeBase.MAX_HISTORY) {
        this.kb.priceHistory = this.kb.priceHistory.slice(-ConfiguratorKnowledgeBase.MAX_HISTORY);
      }

      // Trim health checks
      for (const sh of Object.values(this.kb.supplierHealth)) {
        if (sh.recentChecks.length > ConfiguratorKnowledgeBase.MAX_HEALTH_CHECKS) {
          sh.recentChecks = sh.recentChecks.slice(-ConfiguratorKnowledgeBase.MAX_HEALTH_CHECKS);
        }
      }

      this.kb.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.filePath, JSON.stringify(this.kb, null, 2));
      this.dirty = false;
    } catch (e) {
      console.error(`❌ KB save error: ${(e as Error).message}`);
    }
  }

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.save();
      this.saveTimer = null;
    }, 10_000); // Debounce: save max once per 10s
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 3: Field Scanner & Auto-Discovery
  // ══════════════════════════════════════════════════════════════

  /**
   * Record discovered fields for a product.
   * Called after scanning a configurator form.
   */
  recordProductFields(supplier: string, productName: string, fields: Omit<FieldDefinition, 'discoveredAt' | 'updatedAt' | 'source'>[]): void {
    const key = `${supplier}:${productName}`;
    const now = new Date().toISOString();

    if (!this.kb.products[key]) {
      this.kb.products[key] = {
        productName, supplier,
        fields: {},
        scanCount: 0,
      };
    }

    const pk = this.kb.products[key];
    pk.lastScanned = now;
    pk.scanCount++;

    for (const f of fields) {
      const existing = pk.fields[f.name];
      pk.fields[f.name] = {
        ...f,
        discoveredAt: existing?.discoveredAt || now,
        updatedAt: now,
        source: 'scan',
        // Preserve learned limits if scan doesn't provide them
        min: f.min ?? existing?.min,
        max: f.max ?? existing?.max,
      };
    }

    this.scheduleSave();
  }

  /**
   * Learn a field limit from an error message.
   * e.g., "Maksymalna wartość 4000" → Width1.max = 4000
   */
  learnFieldLimit(supplier: string, productName: string, fieldName: string, limit: { min?: number; max?: number }): void {
    const key = `${supplier}:${productName}`;
    const now = new Date().toISOString();

    if (!this.kb.products[key]) {
      this.kb.products[key] = { productName, supplier, fields: {}, scanCount: 0 };
    }

    const pk = this.kb.products[key];
    if (!pk.fields[fieldName]) {
      pk.fields[fieldName] = {
        name: fieldName,
        type: 'number',
        discoveredAt: now,
        updatedAt: now,
        source: 'error_recovery',
      };
    }

    const fd = pk.fields[fieldName];
    if (limit.min !== undefined) fd.min = limit.min;
    if (limit.max !== undefined) fd.max = limit.max;
    fd.updatedAt = now;
    fd.source = 'error_recovery';

    console.log(`🧠 KB learned: ${supplier}/${productName} → ${fieldName} ${limit.min !== undefined ? `min=${limit.min}` : ''} ${limit.max !== undefined ? `max=${limit.max}` : ''}`);
    this.scheduleSave();
  }

  /**
   * Get the known max value for a field (or undefined if unknown)
   */
  getFieldMax(supplier: string, productName: string, fieldName: string): number | undefined {
    const key = `${supplier}:${productName}`;
    return this.kb.products[key]?.fields[fieldName]?.max;
  }

  getFieldMin(supplier: string, productName: string, fieldName: string): number | undefined {
    const key = `${supplier}:${productName}`;
    return this.kb.products[key]?.fields[fieldName]?.min;
  }

  getProductKnowledge(supplier: string, productName: string): ProductKnowledge | undefined {
    return this.kb.products[`${supplier}:${productName}`];
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 4: Error Recovery & Auto-Repair
  // ══════════════════════════════════════════════════════════════

  /**
   * Find a fix strategy for a given error.
   * Returns the best matching pattern (highest success rate).
   */
  findFix(supplier: string, product: string | undefined, errorMessage: string): ErrorPattern | null {
    const candidates = this.kb.errorPatterns.filter(p => {
      // Match supplier (* matches all)
      if (p.supplier !== '*' && p.supplier !== supplier) return false;
      // Match product if specified
      if (p.product && product && p.product !== product) return false;
      // Match error message (regex)
      try {
        const rx = new RegExp(p.errorMessage, 'i');
        return rx.test(errorMessage);
      } catch { return false; }
    });

    if (candidates.length === 0) return null;

    // Sort by success rate (descending)
    candidates.sort((a, b) => {
      const rateA = a.successCount + a.failCount > 0 ? a.successCount / (a.successCount + a.failCount) : 0.5;
      const rateB = b.successCount + b.failCount > 0 ? b.successCount / (b.successCount + b.failCount) : 0.5;
      return rateB - rateA;
    });

    return candidates[0];
  }

  /**
   * Record the outcome of applying a fix.
   */
  recordFixOutcome(patternId: string, success: boolean): void {
    const pattern = this.kb.errorPatterns.find(p => p.id === patternId);
    if (!pattern) return;

    if (success) {
      pattern.successCount++;
    } else {
      pattern.failCount++;
    }
    pattern.lastUsed = new Date().toISOString();
    this.scheduleSave();
  }

  /**
   * Learn a NEW error pattern from a failure.
   * Called when no existing pattern matches.
   */
  learnNewErrorPattern(
    supplier: string,
    product: string | undefined,
    errorMessage: string,
    field: string | undefined,
    fixStrategy: ErrorFixStrategy,
    description: string,
  ): ErrorPattern {
    const id = `auto-${supplier}-${Date.now()}`;
    const pattern: ErrorPattern = {
      id, supplier,
      product,
      errorMessage: errorMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // Escape for regex
      field,
      fixStrategy,
      description,
      successCount: 0,
      failCount: 0,
      discoveredAt: new Date().toISOString(),
    };

    this.kb.errorPatterns.push(pattern);
    console.log(`🧠 KB new pattern: [${id}] ${description}`);
    this.scheduleSave();
    return pattern;
  }

  // ══════════════════════════════════════════════════════════════
  // LAYER 5: Health Monitor
  // ══════════════════════════════════════════════════════════════

  /**
   * Record a health check result.
   */
  recordHealthCheck(result: HealthCheckResult): void {
    const { supplier } = result;

    if (!this.kb.supplierHealth[supplier]) {
      this.kb.supplierHealth[supplier] = {
        supplier,
        status: 'healthy',
        lastCheck: result.timestamp,
        lastSuccess: result.success ? result.timestamp : '',
        successRate30d: 100,
        avgDurationMs: result.durationMs,
        recentChecks: [],
      };
    }

    const sh = this.kb.supplierHealth[supplier];
    sh.recentChecks.push(result);
    sh.lastCheck = result.timestamp;
    if (result.success) sh.lastSuccess = result.timestamp;

    // Update reference price on success
    if (result.success && result.priceEUR && result.priceEUR > 100) {
      sh.referencePrice = {
        product: result.product,
        width: 5000, depth: 3500,  // standard test dimensions
        priceEUR: result.priceEUR,
      };
    }

    // Calculate 30d stats
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recent = sh.recentChecks.filter(c => c.timestamp > cutoff);
    const successes = recent.filter(c => c.success).length;
    sh.successRate30d = recent.length > 0 ? Math.round((successes / recent.length) * 100) : 100;
    sh.avgDurationMs = recent.length > 0
      ? Math.round(recent.reduce((s, c) => s + c.durationMs, 0) / recent.length)
      : 0;

    // Determine status
    if (sh.successRate30d >= 90) sh.status = 'healthy';
    else if (sh.successRate30d >= 50) sh.status = 'degraded';
    else sh.status = 'down';

    this.scheduleSave();
  }

  /**
   * Get supplier health status.
   */
  getSupplierHealth(supplier: string): SupplierHealth | undefined {
    return this.kb.supplierHealth[supplier];
  }

  getAllSupplierHealth(): Record<string, SupplierHealth> {
    return this.kb.supplierHealth;
  }

  /**
   * Check if a price is anomalous compared to history.
   * Returns { isAnomaly, reason, expectedRange } 
   */
  checkPriceAnomaly(supplier: string, product: string, width: number, depth: number, priceEUR: number): {
    isAnomaly: boolean;
    reason?: string;
    expectedMin?: number;
    expectedMax?: number;
    historicalAvg?: number;
    confidence: number;
  } {
    // Find similar prices in history (same product, similar dimensions ±500mm)
    const similar = this.kb.priceHistory.filter(p =>
      p.supplier === supplier &&
      p.product === product &&
      p.success &&
      p.priceNetEUR > 0 &&
      Math.abs(p.width - width) <= 500 &&
      Math.abs(p.depth - depth) <= 500
    );

    if (similar.length < 2) {
      return { isAnomaly: false, confidence: 0 }; // Not enough data
    }

    const prices = similar.map(p => p.priceNetEUR);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((s, p) => s + (p - avg) ** 2, 0) / prices.length);

    // Anomaly if > 3 standard deviations OR > 50% deviation from average
    const deviation = Math.abs(priceEUR - avg) / avg;
    const zScore = stdDev > 0 ? Math.abs(priceEUR - avg) / stdDev : 0;

    const isAnomaly = deviation > 0.5 || zScore > 3;

    return {
      isAnomaly,
      reason: isAnomaly
        ? `Price ${priceEUR.toFixed(0)}€ deviates ${(deviation * 100).toFixed(0)}% from avg ${avg.toFixed(0)}€ (z=${zScore.toFixed(1)})`
        : undefined,
      expectedMin: Math.max(0, avg - stdDev * 2),
      expectedMax: avg + stdDev * 2,
      historicalAvg: avg,
      confidence: Math.min(1, similar.length / 10), // More data = more confidence
    };
  }

  // ── Price History ──

  recordPrice(entry: PriceHistoryEntry): void {
    this.kb.priceHistory.push(entry);
    this.scheduleSave();
  }

  /**
   * Estimate a price from historical data when live query fails.
   * Returns null if not enough data.
   */
  estimatePrice(supplier: string, product: string, width: number, depth: number): {
    estimatedPriceEUR: number;
    confidence: number;
    method: 'exact_match' | 'interpolation' | 'per_m2';
    basedOn: number; // number of data points used
  } | null {
    const successful = this.kb.priceHistory.filter(p =>
      p.supplier === supplier &&
      p.product === product &&
      p.success &&
      p.priceNetEUR > 0
    );

    if (successful.length === 0) return null;

    const area = (width * depth) / 1_000_000; // m²

    // Method 1: Exact match (±200mm)
    const exact = successful.filter(p =>
      Math.abs(p.width - width) <= 200 &&
      Math.abs(p.depth - depth) <= 200
    );
    if (exact.length > 0) {
      const avg = exact.reduce((s, p) => s + p.priceNetEUR, 0) / exact.length;
      return {
        estimatedPriceEUR: Math.round(avg * 100) / 100,
        confidence: Math.min(0.95, 0.7 + exact.length * 0.05),
        method: 'exact_match',
        basedOn: exact.length,
      };
    }

    // Method 2: Interpolation (find 2 closest dimension combos)
    const withDistance = successful.map(p => ({
      ...p,
      dist: Math.sqrt((p.width - width) ** 2 + (p.depth - depth) ** 2),
    })).sort((a, b) => a.dist - b.dist);

    if (withDistance.length >= 2 && withDistance[0].dist < 3000) {
      const p1 = withDistance[0];
      const p2 = withDistance[1];
      // Weighted average by inverse distance
      const w1 = 1 / (p1.dist + 1);
      const w2 = 1 / (p2.dist + 1);
      const estimated = (p1.priceNetEUR * w1 + p2.priceNetEUR * w2) / (w1 + w2);
      return {
        estimatedPriceEUR: Math.round(estimated * 100) / 100,
        confidence: Math.min(0.85, 0.5 + 0.05 * Math.min(successful.length, 7)),
        method: 'interpolation',
        basedOn: 2,
      };
    }

    // Method 3: Per m² average
    if (successful.length >= 3) {
      const perM2 = successful.map(p => p.priceNetEUR / ((p.width * p.depth) / 1_000_000));
      const avgPerM2 = perM2.reduce((s, v) => s + v, 0) / perM2.length;
      return {
        estimatedPriceEUR: Math.round(avgPerM2 * area * 100) / 100,
        confidence: Math.min(0.7, 0.3 + 0.05 * Math.min(successful.length, 8)),
        method: 'per_m2',
        basedOn: successful.length,
      };
    }

    return null;
  }

  // ── Summary / Dashboard ──

  getSummary(): {
    products: number;
    patterns: number;
    priceRecords: number;
    suppliers: { name: string; status: string; successRate: number; lastCheck: string }[];
  } {
    return {
      products: Object.keys(this.kb.products).length,
      patterns: this.kb.errorPatterns.length,
      priceRecords: this.kb.priceHistory.length,
      suppliers: Object.values(this.kb.supplierHealth).map(sh => ({
        name: sh.supplier,
        status: sh.status,
        successRate: sh.successRate30d,
        lastCheck: sh.lastCheck,
      })),
    };
  }

  // Export for API endpoint
  toJSON(): KnowledgeBase {
    return this.kb;
  }
}
