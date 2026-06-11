/**
 * Pricing Worker
 * 
 * Processes quote requests from the job queue:
 * 1. Picks up a pending job
 * 2. Runs live pricing via Aliplast/Aluxe configurator
 * 3. Generates 3 tier variants (Economy/Recommended/Premium)
 * 4. Creates an offer with variants in the database
 * 5. Updates job status with results
 * 
 * Usage:
 *   const worker = new PricingWorker();
 *   await worker.processJob(jobId);
 *   // or
 *   await worker.processNextJob(); // picks from queue
 */

import { AliplastPricingService } from './aliplast-pricing-service';
import { TierGeneratorService, type LivePricingResult, type GeneratedTier } from '../../services/tier-generator.service';

// EUR/PLN exchange rate (approximate, should be from config)
const EUR_PLN_RATE = 4.32;

export interface QuoteRequest {
    // Product info
    product: string;       // "Carport", "Pergola", "Trendstyle", etc.
    group?: string;        // "Carport", "Pergola", "Roofing"
    supplier?: string;     // "aliplast", "aluxe", "teranda"
    
    // Dimensions
    width: number;         // mm
    depth: number;         // mm
    height?: number;       // mm (optional)
    
    // Options
    color?: string;        // RAL or configurator code
    installType?: string;  // "Standalone", "WallMount"
    
    // Customer
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    leadId?: string;
    
    // Pricing overrides
    marginEconomy?: number;
    marginRecommended?: number;
    marginPremium?: number;
    installationDays?: number;
    installationCostEUR?: number;
    
    // Internal
    requestedBy?: string;  // User ID
    jobId?: string;
}

export interface QuoteResult {
    success: boolean;
    jobId?: string;
    
    // Pricing
    purchasePriceEUR?: number;
    purchasePricePLN?: number;
    tiers?: GeneratedTier[];
    
    // Offer
    offerId?: string;
    offerToken?: string;
    offerUrl?: string;
    
    // Meta
    supplier?: string;
    orderId?: string;
    durationMs?: number;
    error?: string;
    
    // Progress log (for dashboard)
    log: string[];
}

export class PricingWorker {
    private aliplastService: AliplastPricingService | null = null;
    
    constructor(
        private credentials?: {
            aliplastEmail?: string;
            aliplastPassword?: string;
        }
    ) {}

    /**
     * Process a quote request end-to-end
     */
    async processQuote(request: QuoteRequest): Promise<QuoteResult> {
        const startTime = Date.now();
        const log: string[] = [];
        
        const addLog = (msg: string) => {
            const ts = new Date().toISOString().substring(11, 19);
            log.push(`[${ts}] ${msg}`);
            console.log(`    📋 ${msg}`);
        };

        try {
            addLog(`Rozpoczynam wycenę: ${request.product} ${request.width}x${request.depth}`);
            
            // 1. Determine supplier
            const supplier = this.detectSupplier(request);
            addLog(`Dostawca: ${supplier}`);
            
            // 2. Run live pricing
            addLog(`Uruchamiam konfigurator ${supplier}...`);
            const livePricing = await this.runLivePricing(request, supplier, addLog);
            
            if (!livePricing) {
                return {
                    success: false,
                    log,
                    error: 'Live pricing failed — no result from configurator',
                    durationMs: Date.now() - startTime,
                };
            }
            
            addLog(`✅ Cena zakupu: ${livePricing.purchasePriceEUR.toFixed(2)} EUR (${livePricing.purchasePricePLN.toFixed(2)} PLN)`);
            if (livePricing.orderId) {
                addLog(`📦 Zamówienie dostawcy: #${livePricing.orderId}`);
            }

            // 3. Generate 3 tiers
            addLog('Generuję 3 warianty oferty...');
            const tiers = TierGeneratorService.generateTiers(livePricing, {
                marginEconomy: request.marginEconomy,
                marginRecommended: request.marginRecommended,
                marginPremium: request.marginPremium,
                installationDays: request.installationDays,
                installationCostEUR: request.installationCostEUR,
            });
            
            for (const tier of tiers) {
                addLog(`  ${tier.label}: ${tier.totalNetEUR} EUR netto / ${tier.totalGrossEUR} EUR brutto (marża ${tier.marginPercent}%)`);
            }
            
            addLog('✅ Wycena zakończona pomyślnie');

            return {
                success: true,
                jobId: request.jobId,
                purchasePriceEUR: livePricing.purchasePriceEUR,
                purchasePricePLN: livePricing.purchasePricePLN,
                tiers,
                supplier,
                orderId: livePricing.orderId,
                durationMs: Date.now() - startTime,
                log,
            };
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            addLog(`❌ Błąd: ${errMsg}`);
            return {
                success: false,
                error: errMsg,
                durationMs: Date.now() - startTime,
                log,
            };
        }
    }

    /**
     * Detect which supplier to use based on product
     */
    private detectSupplier(request: QuoteRequest): string {
        if (request.supplier) return request.supplier;
        
        const product = request.product.toLowerCase();
        const group = (request.group || '').toLowerCase();
        
        // Aliplast products
        if (['carport', 'pergola', 'zip screen', 'zip_screen'].some(p => product.includes(p) || group.includes(p))) {
            return 'aliplast';
        }
        
        // Aluxe/Teranda products (roofing)
        if (['trendstyle', 'trendline', 'topstyle', 'topline', 'orangestyle', 'orangeline',
             'designline', 'ultrastyle', 'ultraline', 'skyline', 'skystyle'].some(p => product.includes(p))) {
            return 'aluxe';
        }
        
        // Default to aliplast
        return 'aliplast';
    }

    /**
     * Run live pricing on the correct configurator
     */
    private async runLivePricing(
        request: QuoteRequest,
        supplier: string,
        addLog: (msg: string) => void
    ): Promise<LivePricingResult | null> {
        if (supplier === 'aliplast') {
            return this.runAliplastPricing(request, addLog);
        }
        
        // TODO: Add aluxe, teranda support
        addLog(`⚠️ Supplier ${supplier} not yet supported, falling back to Aliplast`);
        return this.runAliplastPricing(request, addLog);
    }

    /**
     * Run Aliplast live pricing
     */
    private async runAliplastPricing(
        request: QuoteRequest,
        addLog: (msg: string) => void
    ): Promise<LivePricingResult | null> {
        if (!this.aliplastService) {
            const email = this.credentials?.aliplastEmail || process.env.ALIPLAST_EMAIL;
            const password = this.credentials?.aliplastPassword || process.env.ALIPLAST_PASSWORD;
            
            if (!email || !password) {
                addLog('❌ Brak danych logowania Aliplast');
                return null;
            }
            
            this.aliplastService = new AliplastPricingService({ email, password });
        }
        
        addLog('Logowanie do Aliplast...');
        
        const group = request.group || this.detectProductGroup(request.product);
        
        const result = await this.aliplastService.getPrice({
            group,
            product: request.product,
            width: request.width,
            depth: request.depth,
            carport: group === 'Carport' ? {
                installType: (request.installType as any) || 'Standalone',
                profileColor: request.color || '7012ST',
                slatsColor: '7016',
                measuredHeight: request.height || 2400,
            } : undefined,
        });
        
        if (!result.success || !result.priceNetPLN) {
            addLog(`❌ Aliplast error: ${result.error || 'No price returned'}`);
            return null;
        }
        
        return {
            purchasePriceEUR: result.priceNetEUR || result.priceNetPLN / EUR_PLN_RATE,
            purchasePricePLN: result.priceNetPLN,
            supplier: 'aliplast',
            product: request.product,
            group,
            width: request.width,
            depth: request.depth,
            color: request.color,
            orderId: result.orderId,
            lineItems: result.lineItems,
        };
    }

    private detectProductGroup(product: string): string {
        const p = product.toLowerCase();
        if (p.includes('carport')) return 'Carport';
        if (p.includes('pergola')) return 'Pergola';
        if (p.includes('zip')) return 'ZIP Screen';
        return 'Pergola'; // Default
    }

    /**
     * Cleanup resources
     */
    async close() {
        if (this.aliplastService) {
            await this.aliplastService.close();
            this.aliplastService = null;
        }
    }
}
