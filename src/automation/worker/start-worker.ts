// ============================================================================
// Worker Startup Script
// Loads .env.local and bootstraps the Configurator Worker
// ============================================================================
//
// Usage:
//   npx tsx src/automation/worker/start-worker.ts
//
// Or with ts-node:
//   npx ts-node src/automation/worker/start-worker.ts
//
// Environment Variables:
//   VITE_SUPABASE_URL        - Supabase project URL
//   VITE_SUPABASE_ANON_KEY   - Supabase anon key (dev only)
//   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (production)
//   HEADLESS                  - Set to 'true' for headless browser mode
//   POLL_INTERVAL_MS          - Job queue poll interval (default: 5000)
//
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../../.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Could not load .env.local from: ${envPath}`);
  console.warn('   Falling back to system environment variables.');
} else {
  console.log(`✅ Loaded environment from: ${envPath}`);
}

// Map Vite-prefixed env vars to the names the worker expects
if (process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
  // Use anon key for development - switch to service role key for production
  console.warn('⚠️  Using VITE_SUPABASE_ANON_KEY as SUPABASE_SERVICE_ROLE_KEY (dev mode)');
  console.warn('   For production, set SUPABASE_SERVICE_ROLE_KEY to the service role key.');
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

// Start the worker
import './index';
