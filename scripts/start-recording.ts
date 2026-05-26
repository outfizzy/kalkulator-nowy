// Quick script to send a start_recording command to the worker via Supabase Realtime
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const CONFIGURATOR_ID = '4d5f781d-8f15-46fe-bf9f-ebd141dfb1b6';
const RECORDING_ID = 'bc5daef9-22b8-49b6-911b-7cedb5d242ba';

async function main() {
  console.log('📡 Connecting to Supabase Realtime...');
  
  const channel = supabase.channel('worker-commands');
  
  await channel.subscribe((status) => {
    console.log(`Channel status: ${status}`);
    
    if (status === 'SUBSCRIBED') {
      console.log('✅ Subscribed! Sending start_recording command...');
      
      channel.send({
        type: 'broadcast',
        event: 'command',
        payload: {
          type: 'start_recording',
          configuratorId: CONFIGURATOR_ID,
          recordingId: RECORDING_ID,
        },
      }).then(() => {
        console.log('✅ Command sent! The worker should now open Aluxe configurator.');
        console.log('   Browse around, configure a product, and when done run:');
        console.log('   npx tsx scripts/stop-recording.ts');
        setTimeout(() => process.exit(0), 2000);
      });
    }
  });
}

main().catch(console.error);
