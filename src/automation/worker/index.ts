// ============================================================================
// Configurator Worker - Main Entry Point
// Standalone Node.js process that controls browser sessions for recording
// and testing supplier configurators.
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { chromium, Browser } from 'playwright';
import { SessionRecorder } from './recorder';
import { WorkerConfig, WorkerCommand } from '../shared/types';
import path from 'path';
import fs from 'fs';

class ConfiguratorWorker {
  private supabase: SupabaseClient;
  private browser: Browser | null = null;
  private recorder: SessionRecorder | null = null;
  private config: WorkerConfig;
  private isRunning = false;
  private startedAt: number = Date.now();

  constructor() {
    // Read config from env vars or .env.local
    this.config = {
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      supabaseServiceKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
      pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
      workerId: `worker-${process.env.HOSTNAME || 'local'}-${Date.now()}`,
      headless: process.env.HEADLESS === 'true',
      screenshotDir: path.join(process.cwd(), 'recordings'),
    };

    if (!this.config.supabaseUrl || !this.config.supabaseServiceKey) {
      console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
      console.error(
        '   Set them in .env.local or as environment variables before starting the worker.'
      );
      process.exit(1);
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey);
  }

  /**
   * Starts the worker: launches the browser, subscribes to commands, and begins polling.
   */
  async start(): Promise<void> {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        🤖 Configurator Trainer Worker                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Worker ID:    ${this.config.workerId}`);
    console.log(`  Supabase:     ${this.config.supabaseUrl}`);
    console.log(`  Screenshots:  ${this.config.screenshotDir}`);
    console.log(`  Headless:     ${this.config.headless}`);
    console.log(`  Poll Interval: ${this.config.pollIntervalMs}ms`);
    console.log('');

    // Ensure screenshot directory exists
    fs.mkdirSync(this.config.screenshotDir, { recursive: true });

    // Launch browser
    console.log('  🚀 Launching browser...');
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    console.log('  ✅ Browser launched');
    this.isRunning = true;
    this.startedAt = Date.now();

    // Subscribe to Supabase Realtime for commands
    this.subscribeToCommands();

    // Start job queue polling (runs in background)
    this.pollJobQueue();

    // Update worker status periodically
    this.updateWorkerStatus();

    console.log('  ✅ Worker ready. Waiting for commands...');
    console.log('');
    console.log('  Press Ctrl+C to stop the worker.');
    console.log('');
  }

  /**
   * Subscribes to Supabase Realtime broadcast channel for direct commands.
   */
  private subscribeToCommands(): void {
    const channel = this.supabase
      .channel('worker-commands')
      .on('broadcast', { event: 'command' }, (payload) => {
        console.log(`  📩 Broadcast command received: ${JSON.stringify(payload.payload)}`);
        this.handleCommand(payload.payload as WorkerCommand);
      })
      .subscribe((status) => {
        console.log(`  📡 Realtime subscription status: ${status}`);
      });
  }

  /**
   * Polls the job_queue table for pending jobs and processes them.
   * Uses optimistic locking to prevent double-processing.
   */
  private async pollJobQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Try to claim a job
        const { data: jobs, error: fetchError } = await this.supabase
          .from('job_queue')
          .select('*')
          .eq('status', 'pending')
          .lte('scheduled_for', new Date().toISOString())
          .order('priority', { ascending: true })
          .order('scheduled_for', { ascending: true })
          .limit(1);

        if (fetchError) {
          // Only log non-404 errors (table might not exist yet)
          if (!fetchError.message.includes('does not exist')) {
            console.error('  ⚠️ Job queue fetch error:', fetchError.message);
          }
        } else if (jobs && jobs.length > 0) {
          const job = jobs[0];

          // Lock the job with optimistic concurrency control
          const { error: lockError } = await this.supabase
            .from('job_queue')
            .update({
              status: 'processing',
              locked_by: this.config.workerId,
              locked_at: new Date().toISOString(),
              started_at: new Date().toISOString(),
            })
            .eq('id', job.id)
            .eq('status', 'pending'); // Only update if still pending

          if (!lockError) {
            console.log(`  📋 Processing job: ${job.type} (${job.id})`);
            await this.processJob(job);
          }
        }
      } catch (err) {
        console.error('  ⚠️ Job queue poll error:', (err as Error).message);
      }

      // Wait before next poll
      await new Promise((r) => setTimeout(r, this.config.pollIntervalMs));
    }
  }

  /**
   * Periodically updates the worker status in Supabase for monitoring.
   */
  private async updateWorkerStatus(): Promise<void> {
    const updateInterval = 30000; // 30 seconds

    while (this.isRunning) {
      try {
        const status = {
          worker_id: this.config.workerId,
          status: this.recorder ? 'recording' : 'idle',
          current_job: null,
          uptime_ms: Date.now() - this.startedAt,
          last_heartbeat: new Date().toISOString(),
        };

        // Upsert worker status (broadcast to any listeners)
        this.supabase.channel('worker-status').send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: status,
        });
      } catch {
        // Status update is non-critical, ignore failures
      }

      await new Promise((r) => setTimeout(r, updateInterval));
    }
  }

  /**
   * Handles a command received via Realtime broadcast.
   */
  private async handleCommand(cmd: WorkerCommand): Promise<void> {
    console.log(`  📩 Command received: ${cmd.type}`);

    try {
      switch (cmd.type) {
        case 'start_recording':
          await this.startRecording(cmd.configuratorId, cmd.recordingId);
          break;
        case 'stop_recording':
          await this.stopRecording(cmd.recordingId);
          break;
        case 'run_test':
          console.log('  ℹ️ run_test will be implemented in Phase 3');
          break;
        case 'health_check':
          console.log('  ℹ️ health_check will be implemented in Phase 4');
          break;
        default:
          console.warn(`  ⚠️ Unknown command type: ${(cmd as any).type}`);
      }
    } catch (err) {
      console.error(`  ❌ Command ${cmd.type} failed:`, (err as Error).message);
    }
  }

  /**
   * Starts a recording session for a specific configurator.
   */
  private async startRecording(configuratorId: string, recordingId: string): Promise<void> {
    if (!this.browser) throw new Error('Browser not launched');

    if (this.recorder) {
      console.warn('  ⚠️ A recording is already in progress. Stopping the current one first.');
      try {
        await this.stopRecording(recordingId);
      } catch {
        // Force cleanup
        this.recorder = null;
      }
    }

    // Get configurator details from Supabase
    const { data: configurator, error: confError } = await this.supabase
      .from('supplier_configurators')
      .select('*')
      .eq('id', configuratorId)
      .single();

    if (confError || !configurator) {
      throw new Error(
        `Configurator not found: ${configuratorId}${confError ? ` (${confError.message})` : ''}`
      );
    }

    console.log(`  🎬 Starting recording for "${configurator.name}"`);
    console.log(`     URL: ${configurator.url}`);

    // Build credentials from DB + environment variables
    const credentials = configurator.login_required
      ? {
          username: configurator.credentials?.username || '',
          password:
            process.env[
              `${(configurator.supplier || '').toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PASSWORD`
            ] || '',
          usernameField: configurator.credentials?.username_field || '#username',
          passwordField: configurator.credentials?.password_field || '#password',
          submitButton: configurator.credentials?.submit_button || 'button[type=submit]',
        }
      : undefined;

    // Create the recording screenshot directory
    const recordingScreenshotDir = path.join(this.config.screenshotDir, recordingId);

    // Create recorder with real-time callbacks
    this.recorder = new SessionRecorder(this.browser, {
      screenshotDir: recordingScreenshotDir,
      onStep: async (step) => {
        // Send step to Supabase in real-time
        try {
          // Fetch current steps and append
          const { data: recording } = await this.supabase
            .from('configurator_recordings')
            .select('steps')
            .eq('id', recordingId)
            .single();

          if (recording) {
            const steps = [...(recording.steps || []), step];
            await this.supabase
              .from('configurator_recordings')
              .update({ steps, steps_count: steps.length })
              .eq('id', recordingId);
          }

          // Broadcast step to UI via Realtime
          this.supabase.channel('recording-updates').send({
            type: 'broadcast',
            event: 'step',
            payload: { recordingId, step },
          });
        } catch (err) {
          console.error('  ⚠️ Failed to save step:', (err as Error).message);
        }
      },
      onPriceChange: (newPrice: string, oldPrice: string | null) => {
        console.log(`  💰 Price change: ${oldPrice || 'none'} → ${newPrice}`);
        this.supabase.channel('recording-updates').send({
          type: 'broadcast',
          event: 'price_change',
          payload: { recordingId, newPrice, oldPrice },
        });
      },
    });

    // Start recording
    await this.recorder.startRecording(
      configurator.login_url || configurator.url,
      credentials
    );

    // Update recording status in DB
    await this.supabase
      .from('configurator_recordings')
      .update({ status: 'recording' })
      .eq('id', recordingId);

    // Update configurator status
    await this.supabase
      .from('supplier_configurators')
      .update({ status: 'recording' })
      .eq('id', configuratorId);

    console.log('  ✅ Recording started. User can now interact with the browser.');
  }

  /**
   * Stops the current recording session and saves results.
   */
  private async stopRecording(recordingId: string): Promise<void> {
    if (!this.recorder) {
      console.warn('  ⚠️ No active recorder to stop');
      return;
    }

    console.log(`  ⏹ Stopping recording: ${recordingId}`);

    const result = await this.recorder.stopRecording();

    // Calculate unique pages visited
    const uniquePages = new Set(result.steps.map((s) => s.pageUrl)).size;

    // Parse final price to numeric
    let finalPriceNumeric: number | null = null;
    if (result.finalPrice) {
      const cleaned = result.finalPrice.replace(/[^0-9.,]/g, '');
      // Handle European format
      if (cleaned.includes(',') && cleaned.includes('.')) {
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        if (lastComma > lastDot) {
          finalPriceNumeric = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        } else {
          finalPriceNumeric = parseFloat(cleaned.replace(/,/g, ''));
        }
      } else if (cleaned.includes(',')) {
        finalPriceNumeric = parseFloat(cleaned.replace(',', '.'));
      } else {
        finalPriceNumeric = parseFloat(cleaned);
      }
    }

    // Update recording in DB
    try {
      await this.supabase
        .from('configurator_recordings')
        .update({
          status: 'completed',
          steps: result.steps,
          steps_count: result.steps.length,
          pages_visited: uniquePages,
          duration_ms: result.durationMs,
          final_price: finalPriceNumeric,
        })
        .eq('id', recordingId);
    } catch (err) {
      console.error('  ⚠️ Failed to update recording in DB:', (err as Error).message);
    }

    // Broadcast completion via Realtime
    this.supabase.channel('recording-updates').send({
      type: 'broadcast',
      event: 'recording_complete',
      payload: {
        recordingId,
        stepsCount: result.steps.length,
        finalPrice: result.finalPrice,
        durationMs: result.durationMs,
      },
    });

    this.recorder = null;
    console.log(`  ✅ Recording stopped. ${result.steps.length} steps captured in ${Math.round(result.durationMs / 1000)}s.`);
  }

  /**
   * Processes a job from the job_queue table.
   */
  private async processJob(job: any): Promise<void> {
    try {
      switch (job.type) {
        case 'start_recording':
          await this.startRecording(job.payload?.configurator_id, job.payload?.recording_id);
          break;
        case 'stop_recording':
          await this.stopRecording(job.payload?.recording_id);
          break;
        case 'recording_analysis':
          // Will be handled by Edge Function in Phase 2
          console.log('  ℹ️ recording_analysis will be handled by Edge Function');
          break;
        case 'config_test':
          // Phase 3
          console.log('  ℹ️ config_test will be implemented in Phase 3');
          break;
        case 'price_monitor':
          // Phase 4
          console.log('  ℹ️ price_monitor will be implemented in Phase 4');
          break;
        default:
          console.warn(`  ⚠️ Unknown job type: ${job.type}`);
      }

      // Mark job as completed
      await this.supabase
        .from('job_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`  ✅ Job completed: ${job.id}`);
    } catch (err: any) {
      console.error(`  ❌ Job failed: ${err.message}`);

      const newAttempts = (job.attempts || 0) + 1;
      const maxAttempts = job.max_attempts || 3;

      await this.supabase
        .from('job_queue')
        .update({
          status: newAttempts >= maxAttempts ? 'failed' : 'pending',
          error: err.message,
          attempts: newAttempts,
          locked_by: null,
          locked_at: null,
        })
        .eq('id', job.id);

      if (newAttempts >= maxAttempts) {
        console.log(`  ⛔ Job permanently failed after ${newAttempts} attempts: ${job.id}`);
      } else {
        console.log(`  🔄 Job will be retried (attempt ${newAttempts}/${maxAttempts}): ${job.id}`);
      }
    }
  }

  /**
   * Gracefully shuts down the worker.
   */
  async shutdown(): Promise<void> {
    console.log('');
    console.log('  🛑 Shutting down worker...');
    this.isRunning = false;

    // Stop active recording
    if (this.recorder) {
      console.log('  ⏹ Stopping active recording...');
      try {
        await this.recorder.stopRecording();
      } catch (err) {
        console.warn('  ⚠️ Failed to stop recorder:', (err as Error).message);
      }
      this.recorder = null;
    }

    // Close browser
    if (this.browser) {
      console.log('  🔒 Closing browser...');
      try {
        await this.browser.close();
      } catch (err) {
        console.warn('  ⚠️ Failed to close browser:', (err as Error).message);
      }
      this.browser = null;
    }

    console.log('  👋 Worker stopped.');
    console.log('');
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

const worker = new ConfiguratorWorker();

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  await worker.shutdown();
  process.exit(0);
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  await worker.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('  ❌ Uncaught exception:', err);
  // Don't exit - the worker should be resilient
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('  ❌ Unhandled rejection:', reason);
  // Don't exit - the worker should be resilient
});

// Start the worker
worker.start().catch((err) => {
  console.error('  ❌ Fatal error:', err);
  process.exit(1);
});
