// Quick script to send a stop_recording command to the worker
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

const RECORDING_ID = 'bc5daef9-22b8-49b6-911b-7cedb5d242ba';

async function main() {
  console.log('📡 Connecting to Supabase Realtime...');
  
  const channel = supabase.channel('worker-commands');
  
  await channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Sending stop_recording command...');
      
      channel.send({
        type: 'broadcast',
        event: 'command',
        payload: {
          type: 'stop_recording',
          recordingId: RECORDING_ID,
        },
      }).then(() => {
        console.log('✅ Stop command sent!');
        console.log('   Check the worker logs for the recording summary.');
        setTimeout(() => process.exit(0), 2000);
      });
    }
  });
}

main().catch(console.error);
