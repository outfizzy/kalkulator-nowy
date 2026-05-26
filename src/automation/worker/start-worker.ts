// ============================================================================
// Worker Startup Script
// Loads .env.local and bootstraps the Configurator Worker
// ============================================================================
//
// Usage:
//   npm run worker:start
//
// Environment Variables (in .env.local):
//   VITE_SUPABASE_URL         - Supabase project URL
//   VITE_SUPABASE_ANON_KEY    - Supabase anon key
//   WORKER_ADMIN_EMAIL         - Admin user email for RLS auth
//   WORKER_ADMIN_PASSWORD      - Admin user password
//   HEADLESS                   - 'true' for headless browser (default: false = visible)
//
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Start the worker
import('./index.js');
