// ============================================================================
// Session Recorder - Intercepts user actions in a Playwright browser
// Uses page.exposeFunction() to bridge browser events to Node.js
// ============================================================================

import { Browser, Page, BrowserContext } from 'playwright';
import { DOMAnalyzer } from './dom-analyzer';
import { AutomationRecordingStep, DOMSnapshot, PageChanges } from '../shared/types';
import path from 'path';
import fs from 'fs';

export interface RecorderConfig {
  screenshotDir: string;
  onStep?: (step: AutomationRecordingStep) => void;
  onPriceChange?: (newPrice: string, oldPrice: string | null) => void;
}

export interface RecordingCredentials {
  username: string;
  password: string;
  usernameField: string;
  passwordField: string;
  submitButton: string;
}

export interface RecordingResult {
  steps: AutomationRecordingStep[];
  durationMs: number;
  finalPrice: string | null;
}

export class SessionRecorder {
  private page: Page | null = null;
  private context: BrowserContext | null = null;
  private steps: AutomationRecordingStep[] = [];
  private stepSeq: number = 0;
  private domAnalyzer: DOMAnalyzer | null = null;
  private previousSnapshot: DOMSnapshot | null = null;
  private startTime: number = 0;
  private isRecording: boolean = false;
  private captureInProgress: boolean = false;

  // Callbacks for real-time updates
  private onStep: ((step: AutomationRecordingStep) => void) | null = null;
  private onPriceChange: ((newPrice: string, oldPrice: string | null) => void) | null = null;

  constructor(
    private browser: Browser,
    private config: RecorderConfig
  ) {
    this.onStep = config.onStep || null;
    this.onPriceChange = config.onPriceChange || null;
  }

  /**
   * Starts recording user actions on the specified URL.
   * Opens a browser window, optionally logs in, and attaches event listeners.
   */
  async startRecording(url: string, credentials?: RecordingCredentials): Promise<void> {
    // Ensure screenshot directory exists
    fs.mkdirSync(this.config.screenshotDir, { recursive: true });

    // 1. Create browser context with viewport 1280x900
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'de-DE', // German locale for proper number formatting
      ignoreHTTPSErrors: true,
    });

    // 2. Open new page
    this.page = await this.context.newPage();

    // 3. Navigate to URL
    console.log(`  📄 Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 4. If credentials provided, auto-login
    if (credentials && credentials.username) {
      console.log('  🔑 Performing auto-login...');
      try {
        await this.page.waitForSelector(credentials.usernameField, { timeout: 10000 });
        await this.page.fill(credentials.usernameField, credentials.username);
        await this.page.fill(credentials.passwordField, credentials.password);
        await this.page.click(credentials.submitButton);
        await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
        console.log('  ✅ Login successful');
      } catch (err) {
        console.warn('  ⚠️ Auto-login failed, continuing without login:', (err as Error).message);
      }
    }

    // 5. Initialize DOMAnalyzer
    this.domAnalyzer = new DOMAnalyzer(this.page);

    // 6. Take initial snapshot
    this.previousSnapshot = await this.domAnalyzer.snapshot();
    this.startTime = Date.now();
    this.stepSeq = 0;
    this.steps = [];

    // Record initial page load step
    await this.captureStep('page_load', null, null, this.page.url());

    // 7. Attach event listeners
    await this.attachEventListeners();

    // 8. Set recording flag
    this.isRecording = true;
    console.log('  🎬 Recording started. Event listeners attached.');
  }

  /**
   * Stops the recording and returns all captured steps with metadata.
   */
  async stopRecording(): Promise<RecordingResult> {
    // 1. Set isRecording = false
    this.isRecording = false;

    let finalPrice: string | null = null;

    if (this.page && !this.page.isClosed()) {
      // 2. Take final screenshot
      try {
        await this.captureStep('screenshot', null, null, 'Final screenshot');
      } catch (err) {
        console.warn('Failed to take final screenshot:', (err as Error).message);
      }

      // 3. Get final price
      try {
        if (this.domAnalyzer) {
          finalPrice = await this.domAnalyzer.getVisiblePrice();
        }
      } catch (err) {
        console.warn('Failed to get final price:', (err as Error).message);
      }
    }

    // 4. Calculate duration
    const durationMs = Date.now() - this.startTime;

    // 5. Close context (not browser)
    if (this.context) {
      try {
        await this.context.close();
      } catch (err) {
        console.warn('Failed to close context:', (err as Error).message);
      }
    }

    this.page = null;
    this.context = null;
    this.domAnalyzer = null;
    this.previousSnapshot = null;

    // 6. Return all steps + metadata
    return {
      steps: [...this.steps],
      durationMs,
      finalPrice,
    };
  }

  /**
   * Attaches event listeners to the page via page.exposeFunction() and page.evaluate().
   * This bridges browser-side DOM events to Node.js callbacks.
   */
  private async attachEventListeners(): Promise<void> {
    if (!this.page) return;
    const page = this.page;

    // --- Expose functions from Node.js to the browser ---

    // Click handler
    await page.exposeFunction(
      '__recorder_click',
      (selector: string, text: string, href: string | null) => {
        if (!this.isRecording) return;
        this.captureStep('click', selector, href, text).catch((err) =>
          console.error('Click capture failed:', err.message)
        );
      }
    );

    // Change handler (select, checkbox, radio)
    await page.exposeFunction(
      '__recorder_change',
      (selector: string, value: string, tagName: string) => {
        if (!this.isRecording) return;
        const action = tagName === 'SELECT' ? 'select' : 'input';
        this.captureStep(action, selector, value, null).catch((err) =>
          console.error('Change capture failed:', err.message)
        );
      }
    );

    // Input handler (text input, debounced from browser side)
    await page.exposeFunction(
      '__recorder_input',
      (selector: string, value: string) => {
        if (!this.isRecording) return;
        this.captureStep('input', selector, value, null).catch((err) =>
          console.error('Input capture failed:', err.message)
        );
      }
    );

    // Scroll handler
    await page.exposeFunction(
      '__recorder_scroll',
      (scrollX: number, scrollY: number) => {
        if (!this.isRecording) return;
        this.captureStep('scroll', null, `${scrollX},${scrollY}`, null).catch((err) =>
          console.error('Scroll capture failed:', err.message)
        );
      }
    );

    // --- Inject client-side event listeners ---
    await page.evaluate(() => {
      // ---- Selector builder (duplicated in browser context) ----
      function buildSelector(el: Element): string {
        if (el.id) return `#${CSS.escape(el.id)}`;

        const name = el.getAttribute('name');
        if (name) {
          const byName = document.querySelectorAll(`[name="${CSS.escape(name)}"]`);
          if (byName.length === 1) return `[name="${name}"]`;
        }

        if (el.classList.length > 0) {
          const classSelector = Array.from(el.classList)
            .map((c) => `.${CSS.escape(c)}`)
            .join('');
          try {
            const matches = document.querySelectorAll(classSelector);
            if (matches.length === 1) return classSelector;
          } catch {
            // invalid selector
          }
        }

        // Path from nearest ID ancestor
        let current: Element | null = el;
        const pathParts: string[] = [];
        while (current && current !== document.documentElement) {
          if (current.id) {
            pathParts.unshift(`#${CSS.escape(current.id)}`);
            break;
          }
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (c) => c.tagName === current!.tagName
            );
            if (siblings.length > 1) {
              const idx = siblings.indexOf(current) + 1;
              pathParts.unshift(
                `${current.tagName.toLowerCase()}:nth-child(${idx})`
              );
            } else {
              pathParts.unshift(current.tagName.toLowerCase());
            }
          } else {
            pathParts.unshift(current.tagName.toLowerCase());
          }
          current = parent;
        }
        return pathParts.join(' > ');
      }

      // ---- Click listener (capture phase) ----
      document.addEventListener(
        'click',
        (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (!target) return;

          // Skip invisible or tiny elements
          const rect = target.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;

          const selector = buildSelector(target);
          const text = (target.textContent?.trim() || '').substring(0, 100);
          const href = target.closest('a')?.getAttribute('href') || null;

          // @ts-ignore - exposed function
          window.__recorder_click(selector, text, href);
        },
        true
      );

      // ---- Change listener (for selects, checkboxes, radios) ----
      document.addEventListener(
        'change',
        (e: Event) => {
          const target = e.target as HTMLInputElement | HTMLSelectElement;
          if (!target) return;

          const selector = buildSelector(target);
          const value = target.value || '';
          const tagName = target.tagName;

          // @ts-ignore
          window.__recorder_change(selector, value, tagName);
        },
        true
      );

      // ---- Input listener (debounced for text fields) ----
      const inputTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
      document.addEventListener(
        'input',
        (e: Event) => {
          const target = e.target as HTMLInputElement | HTMLTextAreaElement;
          if (!target) return;
          // Only debounce text-like inputs
          const type = target.type?.toLowerCase() || 'text';
          if (['checkbox', 'radio', 'file', 'range'].includes(type)) return;

          const selector = buildSelector(target);
          const value = target.value || '';

          // Debounce: wait 800ms after last keystroke
          const existingTimer = inputTimers.get(selector);
          if (existingTimer) clearTimeout(existingTimer);

          inputTimers.set(
            selector,
            setTimeout(() => {
              inputTimers.delete(selector);
              // @ts-ignore
              window.__recorder_input(selector, value);
            }, 800)
          );
        },
        true
      );

      // ---- Scroll listener (debounced, only significant scrolls) ----
      let scrollTimer: ReturnType<typeof setTimeout> | null = null;
      let lastScrollY = window.scrollY;
      window.addEventListener('scroll', () => {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          const deltaY = Math.abs(window.scrollY - lastScrollY);
          if (deltaY > 200) {
            // Only capture significant scrolls
            lastScrollY = window.scrollY;
            // @ts-ignore
            window.__recorder_scroll(window.scrollX, window.scrollY);
          }
        }, 500);
      });
    });

    // --- Page-level event listeners (Node.js side) ---

    // Page load / navigation
    page.on('load', () => {
      if (!this.isRecording) return;
      this.captureStep('page_load', null, null, page.url()).catch((err) =>
        console.error('Page load capture failed:', err.message)
      );
    });

    // Dialog handling (alerts, confirms, prompts)
    page.on('dialog', async (dialog) => {
      console.log(`  💬 Dialog: ${dialog.type()} - "${dialog.message()}"`);
      try {
        await dialog.accept();
      } catch {
        // Dialog may have already been dismissed
      }
    });

    // Detect AJAX responses that might contain price updates
    page.on('response', async (response) => {
      if (!this.isRecording) return;

      try {
        const contentType = response.headers()['content-type'] || '';
        if (
          response.ok() &&
          (contentType.includes('json') || contentType.includes('html')) &&
          response.url() !== page.url()
        ) {
          // After AJAX response, check for price changes with a small delay
          setTimeout(async () => {
            if (!this.isRecording || !this.domAnalyzer) return;
            try {
              const currentPrice = await this.domAnalyzer.getVisiblePrice();
              if (
                currentPrice &&
                this.previousSnapshot?.priceElements?.[0]?.text !== currentPrice
              ) {
                const oldPrice = this.previousSnapshot?.priceElements?.[0]?.text || null;
                await this.captureStep('price_change', null, currentPrice, oldPrice);
              }
            } catch {
              // Price check failed silently
            }
          }, 500);
        }
      } catch {
        // Response handling failed silently
      }
    });
  }

  /**
   * Captures a single recording step with screenshot, DOM snapshot, and page changes.
   * Resilient: logs errors but never throws.
   */
  private async captureStep(
    action: string,
    selector: string | null,
    value: string | null,
    targetText: string | null
  ): Promise<void> {
    // Prevent concurrent captures that could corrupt state
    if (this.captureInProgress) return;
    this.captureInProgress = true;

    try {
      if (!this.page || this.page.isClosed()) return;

      // 1. Increment stepSeq
      this.stepSeq++;
      const seq = this.stepSeq;

      // 2. Take screenshot
      let screenshotPath: string | null = null;
      try {
        const screenshotFile = `step_${String(seq).padStart(3, '0')}.png`;
        screenshotPath = path.join(this.config.screenshotDir, screenshotFile);
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: false,
          timeout: 5000,
        });
      } catch (err) {
        console.warn(`  ⚠️ Screenshot failed for step ${seq}:`, (err as Error).message);
        screenshotPath = null;
      }

      // 3. Get current DOM snapshot
      let currentSnapshot: DOMSnapshot | null = null;
      let domSnapshotPath: string | null = null;
      try {
        if (this.domAnalyzer) {
          currentSnapshot = await this.domAnalyzer.snapshot();
          // Save DOM snapshot as JSON
          const snapshotFile = `step_${String(seq).padStart(3, '0')}_dom.json`;
          domSnapshotPath = path.join(this.config.screenshotDir, snapshotFile);
          fs.writeFileSync(domSnapshotPath, JSON.stringify(currentSnapshot, null, 2));
        }
      } catch (err) {
        console.warn(`  ⚠️ DOM snapshot failed for step ${seq}:`, (err as Error).message);
      }

      // 4. Detect page changes vs previous snapshot
      let pageChanges: PageChanges | null = null;
      try {
        if (this.domAnalyzer && this.previousSnapshot) {
          pageChanges = await this.domAnalyzer.getPageChanges(this.previousSnapshot);
        }
      } catch (err) {
        console.warn(`  ⚠️ Page changes detection failed for step ${seq}:`, (err as Error).message);
      }

      // 5. Get current visible price
      let visiblePrice: string | null = null;
      try {
        if (this.domAnalyzer) {
          visiblePrice = await this.domAnalyzer.getVisiblePrice();
        }
      } catch (err) {
        console.warn(`  ⚠️ Price detection failed for step ${seq}:`, (err as Error).message);
      }

      // 6. Build AutomationRecordingStep
      const step: AutomationRecordingStep = {
        seq,
        action: action as AutomationRecordingStep['action'],
        targetSelector: selector,
        targetText: targetText ? targetText.substring(0, 200) : null,
        value: value ? value.substring(0, 500) : null,
        screenshotPath,
        domSnapshotPath,
        pageUrl: this.page.url(),
        visiblePrice,
        timestampMs: Date.now() - this.startTime,
        pageChanges,
      };

      // 7. Push to steps[]
      this.steps.push(step);

      // 8. Update previousSnapshot
      if (currentSnapshot) {
        this.previousSnapshot = currentSnapshot;
      }

      // 9. Call onStep callback
      if (this.onStep) {
        try {
          this.onStep(step);
        } catch (err) {
          console.warn('  ⚠️ onStep callback failed:', (err as Error).message);
        }
      }

      // 10. If price changed, call onPriceChange callback
      if (pageChanges?.priceChanged && pageChanges.newPrice && this.onPriceChange) {
        try {
          this.onPriceChange(pageChanges.newPrice, pageChanges.oldPrice);
        } catch (err) {
          console.warn('  ⚠️ onPriceChange callback failed:', (err as Error).message);
        }
      }

      console.log(
        `  📝 Step ${seq}: ${action}${selector ? ` → ${selector}` : ''}${value ? ` = "${value.substring(0, 50)}"` : ''}${visiblePrice ? ` [Price: ${visiblePrice}]` : ''}`
      );
    } catch (err) {
      console.error(`  ❌ captureStep failed (action: ${action}):`, (err as Error).message);
    } finally {
      this.captureInProgress = false;
    }
  }

  /**
   * Returns a copy of all captured steps.
   */
  getSteps(): AutomationRecordingStep[] {
    return [...this.steps];
  }

  /**
   * Returns the current Playwright page instance, if recording is active.
   */
  getPage(): Page | null {
    return this.page;
  }
}
