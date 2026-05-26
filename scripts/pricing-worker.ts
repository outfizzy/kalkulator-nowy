// ============================================================================
// Polendach24 Pricing Worker — HTTP server for on-demand price queries
// Runs locally (or on VPS) and serves real-time Aluxe prices
// 
// Usage: npx tsx scripts/pricing-worker.ts
// API:   POST http://localhost:3456/api/price
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { AluxePricingService, PRODUCT_LINE_MAP, type PriceRequest } from '../src/automation/worker/aluxe-pricing-service';
import { formatEUR } from '../src/automation/worker/pricing-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PORT = parseInt(process.env.WORKER_PORT || '3456');
const API_KEY = process.env.WORKER_API_KEY || 'polendach24-dev'; // Simple auth

let service: AluxePricingService;
let requestCount = 0;

function log(msg: string) {
  console.log(`[${new Date().toISOString().substring(11, 19)}] ${msg}`);
}

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

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🏗️  Polendach24 Pricing Worker                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Port:     ${PORT}`);
  console.log(`  Endpoint: POST http://localhost:${PORT}/api/price`);
  console.log(`  Health:   GET  http://localhost:${PORT}/health`);
  console.log(`  Products: GET  http://localhost:${PORT}/products`);
  console.log();

  // Initialize service
  service = new AluxePricingService({
    username: process.env.ALUXE_USERNAME || 'Polendach24',
    password: process.env.ALUXE_PASSWORD || '',
  });

  // Pre-warm the session
  log('🔑 Pre-warming Aluxe session...');
  await service.init();
  log('✅ Ready to serve prices!\n');

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

    // Auth check
    const authHeader = req.headers.authorization;
    if (req.url !== '/health' && authHeader !== `Bearer ${API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      // Routes
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          session: service.isSessionActive() ? 'active' : 'expired',
          requests: requestCount,
          uptime: process.uptime(),
        }));
        return;
      }

      if (req.url === '/products' && req.method === 'GET') {
        const products = Object.keys(PRODUCT_LINE_MAP).map(key => ({
          key,
          productId: PRODUCT_LINE_MAP[key as keyof typeof PRODUCT_LINE_MAP],
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ products }));
        return;
      }

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

      // Batch pricing
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
