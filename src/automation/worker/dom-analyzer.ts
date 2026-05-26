// ============================================================================
// DOM Analyzer - Extracts structured data from Playwright pages
// All browser-side code is passed as strings to avoid tsx/esbuild __name bug
// ============================================================================

import { Page } from 'playwright';
import {
  DOMSnapshot,
  PriceElement,
  PageChanges,
} from '../shared/types';

// ============================================================================
// Browser-side code as strings (avoids tsx __name() injection)
// ============================================================================

const BROWSER_HELPERS = `
function buildSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  var name = el.getAttribute('name');
  if (name) {
    var byName = document.querySelectorAll('[name="' + CSS.escape(name) + '"]');
    if (byName.length === 1) return '[name="' + name + '"]';
  }
  if (el.classList && el.classList.length > 0) {
    var classSelector = Array.from(el.classList).map(function(c) { return '.' + CSS.escape(c); }).join('');
    try {
      var matches = document.querySelectorAll(classSelector);
      if (matches.length === 1) return classSelector;
    } catch(e) {}
  }
  var current = el;
  var pathParts = [];
  while (current && current !== document.documentElement) {
    if (current.id) { pathParts.unshift('#' + CSS.escape(current.id)); break; }
    var parent = current.parentElement;
    if (parent) {
      var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
      if (siblings.length > 1) {
        var idx = siblings.indexOf(current) + 1;
        pathParts.unshift(current.tagName.toLowerCase() + ':nth-child(' + idx + ')');
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

function isVisible(el) {
  var style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  var rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findLabel(el) {
  var id = el.id;
  if (id) {
    var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
    if (label) return (label.textContent || '').trim() || null;
  }
  var parentLabel = el.closest('label');
  if (parentLabel) {
    var clone = parentLabel.cloneNode(true);
    clone.querySelectorAll('input, select, textarea').forEach(function(inp) { inp.remove(); });
    return (clone.textContent || '').trim() || null;
  }
  var ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  if (el.placeholder) return el.placeholder;
  return null;
}

function parseEuropeanPrice(text) {
  var cleaned = text.replace(/[^\\d.,]/g, '');
  if (!cleaned) return null;
  if (cleaned.indexOf(',') !== -1 && cleaned.indexOf('.') !== -1) {
    var lastComma = cleaned.lastIndexOf(',');
    var lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) return parseFloat(cleaned.replace(/\\./g, '').replace(',', '.'));
    else return parseFloat(cleaned.replace(/,/g, ''));
  }
  if (cleaned.indexOf(',') !== -1 && cleaned.indexOf('.') === -1) {
    var parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) return parseFloat(cleaned.replace(',', '.'));
    return parseFloat(cleaned.replace(/,/g, ''));
  }
  return parseFloat(cleaned) || null;
}
`;

const SNAPSHOT_SCRIPT = `(function() {
  ${BROWSER_HELPERS}
  
  var forms = [];
  document.querySelectorAll('form').forEach(function(form) {
    var fields = [];
    form.querySelectorAll('input, select, textarea').forEach(function(field) {
      var type = field.tagName.toLowerCase() === 'select' ? 'select' : 
                 field.tagName.toLowerCase() === 'textarea' ? 'textarea' : 
                 field.type || 'text';
      if (type === 'hidden' || type === 'submit') return;
      
      var fieldData = {
        selector: buildSelector(field),
        type: type,
        name: field.getAttribute('name'),
        id: field.id || null,
        label: findLabel(field),
        value: field.value || '',
        required: field.required || false,
        disabled: field.disabled || false,
        visible: isVisible(field)
      };
      
      if (field.tagName === 'SELECT') {
        fieldData.options = Array.from(field.options).map(function(opt) {
          return { value: opt.value, text: (opt.textContent || '').trim(), selected: opt.selected };
        });
      }
      if (field.tagName === 'INPUT') {
        if (field.min) fieldData.min = field.min;
        if (field.max) fieldData.max = field.max;
        if (field.step) fieldData.step = field.step;
        if (field.placeholder) fieldData.placeholder = field.placeholder;
      }
      fields.push(fieldData);
    });
    forms.push({ id: form.id || null, action: form.action || null, fields: fields });
  });

  // Price elements
  var priceElements = [];
  var priceSelectors = ['.price','.total','.amount','.preis','.bedrag','.prijs',
    '.gesamtpreis','.totaal','.summe','.gesamt','.cost','.subtotal',
    '[class*="price"]','[class*="Price"]','[class*="total"]','[class*="Total"]',
    '[class*="preis"]','[class*="Preis"]','[class*="bedrag"]','[class*="prijs"]',
    '[data-price]','[data-total]','[data-amount]'];
  var scanned = new Set();
  
  priceSelectors.forEach(function(sel) {
    try {
      document.querySelectorAll(sel).forEach(function(el) {
        if (scanned.has(el)) return;
        scanned.add(el);
        var text = (el.textContent || '').trim();
        if (!text) return;
        var numericValue = parseEuropeanPrice(text);
        var currency = null;
        if (text.indexOf('\\u20ac') !== -1 || /EUR/i.test(text)) currency = 'EUR';
        else if (text.indexOf('$') !== -1) currency = 'USD';
        else if (/PLN/i.test(text) || text.indexOf('z\\u0142') !== -1) currency = 'PLN';
        if (numericValue !== null && numericValue > 0) {
          priceElements.push({ selector: buildSelector(el), text: text, numericValue: numericValue, currency: currency });
        }
      });
    } catch(e) {}
  });

  var pricePatterns = [/[\\d.,]+\\s*\\u20ac/, /\\u20ac\\s*[\\d.,]+/, /[\\d.,]+\\s*EUR/i, /[\\d.,]+\\s*PLN/i,
    /Gesamtpreis[:\\s]*[\\d.,]+/i, /Totaal[:\\s]*[\\d.,]+/i, /Preis[:\\s]*[\\d.,]+/i,
    /Total[:\\s]*[\\d.,]+/i, /Summe[:\\s]*[\\d.,]+/i];
  
  document.querySelectorAll('td, th, span, div, p, strong, b, label, h1, h2, h3, h4').forEach(function(el) {
    if (scanned.has(el)) return;
    var directText = Array.from(el.childNodes)
      .filter(function(n) { return n.nodeType === Node.TEXT_NODE; })
      .map(function(n) { return (n.textContent || '').trim(); }).join(' ');
    if (!directText) return;
    if (pricePatterns.some(function(p) { return p.test(directText); })) {
      scanned.add(el);
      var nv = parseEuropeanPrice(directText);
      var cur = null;
      if (directText.indexOf('\\u20ac') !== -1 || /EUR/i.test(directText)) cur = 'EUR';
      if (nv !== null && nv > 1) {
        priceElements.push({ selector: buildSelector(el), text: directText, numericValue: nv, currency: cur });
      }
    }
  });

  // Sections
  var sections = [];
  document.querySelectorAll('section, [class*="section"], [class*="panel"], fieldset').forEach(function(el) {
    var heading = el.querySelector('h1, h2, h3, h4, h5, h6, legend, .title');
    sections.push({ selector: buildSelector(el), heading: heading ? (heading.textContent || '').trim() : null, visible: isVisible(el), childCount: el.children.length });
  });

  // Interactive elements
  var interactiveElements = [];
  document.querySelectorAll('a[href], button, [role="button"], [onclick]').forEach(function(el) {
    interactiveElements.push({
      selector: buildSelector(el), tagName: el.tagName.toLowerCase(),
      type: el.getAttribute('type'), text: ((el.textContent || '').trim()).substring(0, 100),
      visible: isVisible(el), enabled: !el.disabled
    });
  });

  return {
    url: window.location.href, title: document.title, timestamp: Date.now(),
    forms: forms, priceElements: priceElements, sections: sections, interactiveElements: interactiveElements
  };
})()`;

const PRICE_SCRIPT = `(function() {
  ${BROWSER_HELPERS}
  
  var priceSelectors = ['.price','.total','.amount','.preis','.bedrag','.prijs',
    '.gesamtpreis','.totaal','.summe','.gesamt','.cost','.subtotal',
    '[class*="price"]','[class*="Price"]','[class*="total"]','[class*="Total"]',
    '[class*="preis"]','[class*="Preis"]','[data-price]','[data-total]'];
  
  var pricePatterns = [/[\\d.,]+\\s*\\u20ac/, /\\u20ac\\s*[\\d.,]+/, /[\\d.,]+\\s*EUR/i,
    /Gesamtpreis[:\\s]*[\\d.,]+/i, /Totaal[:\\s]*[\\d.,]+/i, /Preis[:\\s]*[\\d.,]+/i,
    /Total[:\\s]*[\\d.,]+/i, /Summe[:\\s]*[\\d.,]+/i];

  for (var i = 0; i < priceSelectors.length; i++) {
    try {
      var els = document.querySelectorAll(priceSelectors[i]);
      for (var j = 0; j < els.length; j++) {
        if (!isVisible(els[j])) continue;
        var text = (els[j].textContent || '').trim();
        if (pricePatterns.some(function(p) { return p.test(text); })) return text;
      }
    } catch(e) {}
  }

  var allEls = document.querySelectorAll('td, th, span, div, p, strong, b, label');
  for (var k = 0; k < allEls.length; k++) {
    if (!isVisible(allEls[k])) continue;
    var directText = Array.from(allEls[k].childNodes)
      .filter(function(n) { return n.nodeType === Node.TEXT_NODE; })
      .map(function(n) { return (n.textContent || '').trim(); }).join(' ');
    if (directText && pricePatterns.some(function(p) { return p.test(directText); })) return directText;
  }
  return null;
})()`;

const FORM_VALUES_SCRIPT = `(function() {
  var values = {};
  document.querySelectorAll('input, select, textarea').forEach(function(field) {
    var key = field.name || field.id || '';
    if (!key) return;
    if (field.type === 'hidden' || field.type === 'submit') return;
    if (field.type === 'checkbox' || field.type === 'radio') {
      if (field.checked) values[key] = field.value || 'on';
    } else {
      values[key] = field.value || '';
    }
  });
  return values;
})()`;

// ============================================================================
// DOMAnalyzer class
// ============================================================================

export class DOMAnalyzer {
  constructor(private page: Page) {}

  async snapshot(): Promise<DOMSnapshot> {
    const result = await this.page.evaluate(SNAPSHOT_SCRIPT);
    return result as DOMSnapshot;
  }

  async getVisiblePrice(): Promise<string | null> {
    return await this.page.evaluate(PRICE_SCRIPT);
  }

  async getFormValues(): Promise<Record<string, string>> {
    return await this.page.evaluate(FORM_VALUES_SCRIPT);
  }

  async getPageChanges(previousSnapshot: DOMSnapshot): Promise<PageChanges> {
    const currentSnapshot = await this.snapshot();

    const prevSelectors = new Set(previousSnapshot.interactiveElements.map((e) => e.selector));
    const currSelectors = new Set(currentSnapshot.interactiveElements.map((e) => e.selector));

    const newElements = currentSnapshot.interactiveElements
      .filter((e) => !prevSelectors.has(e.selector) && e.visible)
      .map((e) => e.selector);

    const removedElements = previousSnapshot.interactiveElements
      .filter((e) => !currSelectors.has(e.selector) && e.visible)
      .map((e) => e.selector);

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
          changedFields.push({ selector: field.selector, oldValue: prevValue, newValue: field.value });
        }
      });
    });

    const prevPrices = previousSnapshot.priceElements;
    const currPrices = currentSnapshot.priceElements;

    let priceChanged = false;
    let newPrice: string | null = null;
    let oldPrice: string | null = null;

    if (prevPrices.length > 0 || currPrices.length > 0) {
      const prevMainPrice = prevPrices[0]?.text || null;
      const currMainPrice = currPrices[0]?.text || null;
      if (prevMainPrice !== currMainPrice) {
        priceChanged = true;
        oldPrice = prevMainPrice;
        newPrice = currMainPrice;
      }
    }

    return { newElements, removedElements, changedFields, priceChanged, newPrice, oldPrice };
  }
}
