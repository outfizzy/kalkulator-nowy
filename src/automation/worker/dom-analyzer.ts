// ============================================================================
// DOM Analyzer - Extracts structured data from Playwright pages
// Runs JavaScript in the browser context via page.evaluate()
// ============================================================================

import { Page } from 'playwright';
import {
  DOMSnapshot,
  FieldSnapshot,
  FormSnapshot,
  PriceElement,
  SectionSnapshot,
  InteractiveElement,
  PageChanges,
} from '../shared/types';

export class DOMAnalyzer {
  constructor(private page: Page) {}

  /**
   * Takes a full snapshot of the current page DOM.
   * Runs entirely inside the browser context via page.evaluate().
   */
  async snapshot(): Promise<DOMSnapshot> {
    const result = await this.page.evaluate(() => {
      // ---- Helper: build a robust CSS selector for an element ----
      function buildSelector(el: Element): string {
        if (el.id) return `#${CSS.escape(el.id)}`;

        const name = el.getAttribute('name');
        if (name) {
          const byName = document.querySelectorAll(`[name="${CSS.escape(name)}"]`);
          if (byName.length === 1) return `[name="${name}"]`;
        }

        // Try unique class combination
        if (el.classList.length > 0) {
          const classSelector = Array.from(el.classList)
            .map((c) => `.${CSS.escape(c)}`)
            .join('');
          const matches = document.querySelectorAll(classSelector);
          if (matches.length === 1) return classSelector;
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
              pathParts.unshift(`${current.tagName.toLowerCase()}:nth-child(${idx})`);
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

      // ---- Helper: check if an element is visible ----
      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      // ---- Helper: find label text for a form field ----
      function findLabel(el: Element): string | null {
        // Check for associated <label>
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (label) return label.textContent?.trim() || null;
        }
        // Check for wrapping <label>
        const parentLabel = el.closest('label');
        if (parentLabel) {
          // Get label text excluding the field itself
          const clone = parentLabel.cloneNode(true) as HTMLElement;
          const inputs = clone.querySelectorAll('input, select, textarea');
          inputs.forEach((inp) => inp.remove());
          const text = clone.textContent?.trim();
          return text || null;
        }
        // Check aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;
        // Check placeholder
        const placeholder = (el as HTMLInputElement).placeholder;
        if (placeholder) return placeholder;
        return null;
      }

      // ---- Helper: parse European price string to number ----
      function parseEuropeanPrice(text: string): number | null {
        // Match patterns like: 1.234,56 or 1234,56 or 1234.56
        const cleaned = text.replace(/[^\d.,]/g, '');
        if (!cleaned) return null;

        // European format: 1.234,56 → remove dots, replace comma with dot
        if (cleaned.includes(',') && cleaned.includes('.')) {
          const lastComma = cleaned.lastIndexOf(',');
          const lastDot = cleaned.lastIndexOf('.');
          if (lastComma > lastDot) {
            // European: 1.234,56
            return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
          } else {
            // US: 1,234.56
            return parseFloat(cleaned.replace(/,/g, ''));
          }
        }
        if (cleaned.includes(',') && !cleaned.includes('.')) {
          // Could be European: 1234,56
          const parts = cleaned.split(',');
          if (parts.length === 2 && parts[1].length <= 2) {
            return parseFloat(cleaned.replace(',', '.'));
          }
          // Could be US thousands: 1,234
          return parseFloat(cleaned.replace(/,/g, ''));
        }
        return parseFloat(cleaned) || null;
      }

      // ---- Extract all forms with fields ----
      const forms: FormSnapshot[] = [];
      const formElements = document.querySelectorAll('form');

      formElements.forEach((form) => {
        const fields: FieldSnapshot[] = [];
        const formFields = form.querySelectorAll(
          'input, select, textarea'
        ) as NodeListOf<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

        formFields.forEach((field) => {
          const inputField = field as HTMLInputElement;
          const selectField = field as HTMLSelectElement;

          const fieldSnapshot: FieldSnapshot = {
            selector: buildSelector(field),
            type:
              field.tagName.toLowerCase() === 'select'
                ? 'select'
                : field.tagName.toLowerCase() === 'textarea'
                  ? 'textarea'
                  : inputField.type || 'text',
            name: field.getAttribute('name'),
            id: field.id || null,
            label: findLabel(field),
            value: field.value || '',
            required: field.required,
            disabled: field.disabled,
            visible: isVisible(field),
          };

          // Add options for select elements
          if (field.tagName === 'SELECT') {
            fieldSnapshot.options = Array.from(selectField.options).map((opt) => ({
              value: opt.value,
              text: opt.textContent?.trim() || '',
              selected: opt.selected,
            }));
          }

          // Add extra attributes for inputs
          if (field.tagName === 'INPUT') {
            if (inputField.min) fieldSnapshot.min = inputField.min;
            if (inputField.max) fieldSnapshot.max = inputField.max;
            if (inputField.step) fieldSnapshot.step = inputField.step;
            if (inputField.placeholder) fieldSnapshot.placeholder = inputField.placeholder;
          }

          // Skip hidden fields and submit buttons
          if (inputField.type !== 'hidden' && inputField.type !== 'submit') {
            fields.push(fieldSnapshot);
          }
        });

        forms.push({
          id: form.id || null,
          action: form.action || null,
          fields,
        });
      });

      // Also find form fields not inside a <form> tag
      const orphanFields = document.querySelectorAll(
        'input:not(form input), select:not(form select), textarea:not(form textarea)'
      );
      if (orphanFields.length > 0) {
        const orphanFieldSnapshots: FieldSnapshot[] = [];
        orphanFields.forEach((field) => {
          const inputField = field as HTMLInputElement;
          const selectField = field as HTMLSelectElement;
          const type =
            field.tagName.toLowerCase() === 'select'
              ? 'select'
              : field.tagName.toLowerCase() === 'textarea'
                ? 'textarea'
                : inputField.type || 'text';
          if (type === 'hidden' || type === 'submit') return;

          orphanFieldSnapshots.push({
            selector: buildSelector(field),
            type,
            name: field.getAttribute('name'),
            id: field.id || null,
            label: findLabel(field),
            value: (field as HTMLInputElement).value || '',
            required: (field as HTMLInputElement).required,
            disabled: (field as HTMLInputElement).disabled,
            visible: isVisible(field),
            ...(field.tagName === 'SELECT'
              ? {
                  options: Array.from(selectField.options).map((opt) => ({
                    value: opt.value,
                    text: opt.textContent?.trim() || '',
                    selected: opt.selected,
                  })),
                }
              : {}),
            ...(inputField.min ? { min: inputField.min } : {}),
            ...(inputField.max ? { max: inputField.max } : {}),
            ...(inputField.step ? { step: inputField.step } : {}),
            ...(inputField.placeholder ? { placeholder: inputField.placeholder } : {}),
          });
        });

        if (orphanFieldSnapshots.length > 0) {
          forms.push({
            id: null,
            action: null,
            fields: orphanFieldSnapshots,
          });
        }
      }

      // ---- Extract price elements ----
      const priceElements: PriceElement[] = [];

      // Price-related CSS selectors to scan
      const priceSelectors = [
        '.price',
        '.total',
        '.amount',
        '.preis',
        '.bedrag',
        '.prijs',
        '.gesamtpreis',
        '.totaal',
        '.summe',
        '.gesamt',
        '.cost',
        '.subtotal',
        '.netto',
        '.brutto',
        '[class*="price"]',
        '[class*="Price"]',
        '[class*="total"]',
        '[class*="Total"]',
        '[class*="amount"]',
        '[class*="Amount"]',
        '[class*="preis"]',
        '[class*="Preis"]',
        '[class*="bedrag"]',
        '[class*="prijs"]',
        '[data-price]',
        '[data-total]',
        '[data-amount]',
      ];

      const scannedElements = new Set<Element>();

      // Scan price selectors
      priceSelectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            if (scannedElements.has(el)) return;
            scannedElements.add(el);
            const text = el.textContent?.trim() || '';
            if (!text) return;

            const numericValue = parseEuropeanPrice(text);
            let currency: string | null = null;
            if (text.includes('€') || text.includes('EUR') || text.includes('Eur'))
              currency = 'EUR';
            else if (text.includes('$') || text.includes('USD')) currency = 'USD';
            else if (text.includes('£') || text.includes('GBP')) currency = 'GBP';
            else if (text.includes('PLN') || text.includes('zł')) currency = 'PLN';

            if (numericValue !== null && numericValue > 0) {
              priceElements.push({
                selector: buildSelector(el),
                text,
                numericValue,
                currency,
              });
            }
          });
        } catch {
          // Invalid selector, skip
        }
      });

      // Scan all text nodes for price patterns
      const pricePatterns = [
        /[\d.,]+\s*€/,
        /€\s*[\d.,]+/,
        /[\d.,]+\s*EUR/i,
        /[\d.,]+\s*PLN/i,
        /[\d.,]+\s*zł/i,
        /Gesamtpreis[:\s]*[\d.,]+/i,
        /Totaal[:\s]*[\d.,]+/i,
        /Preis[:\s]*[\d.,]+/i,
        /Prijs[:\s]*[\d.,]+/i,
        /Bedrag[:\s]*[\d.,]+/i,
        /Summe[:\s]*[\d.,]+/i,
        /Total[:\s]*[\d.,]+/i,
      ];

      // Scan common containers for price text
      const containers = document.querySelectorAll('td, th, span, div, p, strong, b, label, h1, h2, h3, h4, h5, h6');
      containers.forEach((el) => {
        if (scannedElements.has(el)) return;
        // Only check direct text content (not nested deeply)
        const directText = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent?.trim())
          .join(' ');
        if (!directText) return;

        const matchesPrice = pricePatterns.some((p) => p.test(directText));
        if (matchesPrice) {
          scannedElements.add(el);
          const numericValue = parseEuropeanPrice(directText);
          let currency: string | null = null;
          if (directText.includes('€') || /EUR/i.test(directText)) currency = 'EUR';
          else if (directText.includes('$') || /USD/i.test(directText)) currency = 'USD';
          else if (/PLN/i.test(directText) || directText.includes('zł')) currency = 'PLN';

          if (numericValue !== null && numericValue > 1) {
            priceElements.push({
              selector: buildSelector(el),
              text: directText,
              numericValue,
              currency,
            });
          }
        }
      });

      // ---- Extract sections (divs/sections with headings) ----
      const sections: SectionSnapshot[] = [];
      const sectionElements = document.querySelectorAll(
        'section, [class*="section"], [class*="panel"], [class*="card"], [class*="block"], fieldset'
      );
      sectionElements.forEach((el) => {
        const heading = el.querySelector('h1, h2, h3, h4, h5, h6, legend, .title, .heading');
        sections.push({
          selector: buildSelector(el),
          heading: heading?.textContent?.trim() || null,
          visible: isVisible(el),
          childCount: el.children.length,
        });
      });

      // ---- Extract interactive elements ----
      const interactiveElements: InteractiveElement[] = [];
      const interactiveSelectors = 'a[href], button, [role="button"], [onclick], [tabindex]';
      document.querySelectorAll(interactiveSelectors).forEach((el) => {
        const htmlEl = el as HTMLElement;
        interactiveElements.push({
          selector: buildSelector(el),
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          text: (htmlEl.textContent?.trim() || '').substring(0, 100),
          visible: isVisible(el),
          enabled: !(htmlEl as HTMLButtonElement).disabled,
        });
      });

      return {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        forms,
        priceElements,
        sections,
        interactiveElements,
      };
    });

    return result as DOMSnapshot;
  }

  /**
   * Scans the page for visible price elements and returns the most prominent one.
   * Handles European formats: €1.234,56 or 1234,56 EUR
   */
  async getVisiblePrice(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const priceSelectors = [
        '.price',
        '.total',
        '.amount',
        '.preis',
        '.bedrag',
        '.prijs',
        '.gesamtpreis',
        '.totaal',
        '.summe',
        '.gesamt',
        '.cost',
        '.subtotal',
        '[class*="price"]',
        '[class*="Price"]',
        '[class*="total"]',
        '[class*="Total"]',
        '[class*="preis"]',
        '[class*="Preis"]',
        '[data-price]',
        '[data-total]',
      ];

      const pricePatterns = [
        /[\d.,]+\s*€/,
        /€\s*[\d.,]+/,
        /[\d.,]+\s*EUR/i,
        /[\d.,]+\s*PLN/i,
        /[\d.,]+\s*zł/i,
        /Gesamtpreis[:\s]*[\d.,]+/i,
        /Totaal[:\s]*[\d.,]+/i,
        /Preis[:\s]*[\d.,]+/i,
        /Total[:\s]*[\d.,]+/i,
        /Summe[:\s]*[\d.,]+/i,
      ];

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
          return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      // First try specific price selectors
      for (const sel of priceSelectors) {
        try {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            if (!isVisible(el)) continue;
            const text = el.textContent?.trim() || '';
            if (pricePatterns.some((p) => p.test(text))) {
              return text;
            }
          }
        } catch {
          // skip invalid selectors
        }
      }

      // Fallback: scan all visible text
      const allElements = document.querySelectorAll('td, th, span, div, p, strong, b, label');
      for (const el of allElements) {
        if (!isVisible(el)) continue;
        const directText = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent?.trim())
          .join(' ');
        if (directText && pricePatterns.some((p) => p.test(directText))) {
          return directText;
        }
      }

      return null;
    });
  }

  /**
   * Gets all current form field values as key-value pairs.
   * Keys are field names/IDs, values are current values.
   */
  async getFormValues(): Promise<Record<string, string>> {
    return await this.page.evaluate(() => {
      const values: Record<string, string> = {};
      const fields = document.querySelectorAll(
        'input, select, textarea'
      ) as NodeListOf<HTMLInputElement>;

      fields.forEach((field) => {
        const key = field.name || field.id || field.getAttribute('data-field') || '';
        if (!key) return;
        if (field.type === 'hidden' || field.type === 'submit') return;

        if (field.type === 'checkbox' || field.type === 'radio') {
          if (field.checked) {
            values[key] = field.value || 'on';
          }
        } else {
          values[key] = field.value || '';
        }
      });

      return values;
    });
  }

  /**
   * Compares the current DOM with a previous snapshot to detect changes.
   */
  async getPageChanges(previousSnapshot: DOMSnapshot): Promise<PageChanges> {
    const currentSnapshot = await this.snapshot();

    // Detect new and removed interactive elements
    const prevSelectors = new Set(previousSnapshot.interactiveElements.map((e) => e.selector));
    const currSelectors = new Set(currentSnapshot.interactiveElements.map((e) => e.selector));

    const newElements = currentSnapshot.interactiveElements
      .filter((e) => !prevSelectors.has(e.selector) && e.visible)
      .map((e) => e.selector);

    const removedElements = previousSnapshot.interactiveElements
      .filter((e) => !currSelectors.has(e.selector) && e.visible)
      .map((e) => e.selector);

    // Detect changed form field values
    const prevFieldMap = new Map<string, string>();
    previousSnapshot.forms.forEach((form) => {
      form.fields.forEach((field) => {
        prevFieldMap.set(field.selector, field.value);
      });
    });

    const changedFields: { selector: string; oldValue: string; newValue: string }[] = [];
    currentSnapshot.forms.forEach((form) => {
      form.fields.forEach((field) => {
        const prevValue = prevFieldMap.get(field.selector);
        if (prevValue !== undefined && prevValue !== field.value) {
          changedFields.push({
            selector: field.selector,
            oldValue: prevValue,
            newValue: field.value,
          });
        }
      });
    });

    // Detect price changes
    const prevPrices = previousSnapshot.priceElements;
    const currPrices = currentSnapshot.priceElements;

    let priceChanged = false;
    let newPrice: string | null = null;
    let oldPrice: string | null = null;

    // Compare the most prominent price (first one found)
    if (prevPrices.length > 0 || currPrices.length > 0) {
      const prevMainPrice = prevPrices[0]?.text || null;
      const currMainPrice = currPrices[0]?.text || null;

      if (prevMainPrice !== currMainPrice) {
        priceChanged = true;
        oldPrice = prevMainPrice;
        newPrice = currMainPrice;
      }
    }

    return {
      newElements,
      removedElements,
      changedFields,
      priceChanged,
      newPrice,
      oldPrice,
    };
  }
}
