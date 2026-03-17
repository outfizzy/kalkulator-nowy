import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════
// META PIXEL + CONVERSIONS API TRACKING
// Dual tracking: client-side (pixel) + server-side (CAPI)
// ═══════════════════════════════════════════

const FB_PIXEL_ID = '1768581477440119';

// ─── Client-side Pixel (browser) ───

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

/**
 * Initialize Meta Pixel on the page (call once in App.tsx)
 */
export function initMetaPixel() {
  if (typeof window === 'undefined' || window.fbq) return;

  // Meta Pixel base code
  (function(f: any, b: any, e: any, v: any) {
    const n: any = f.fbq = function() { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const t = b.createElement(e); t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', FB_PIXEL_ID);
  window.fbq('track', 'PageView');
}

/**
 * Track a standard Meta event (client-side pixel + server-side CAPI)
 */
export async function trackFBEvent(
  eventName: 'PageView' | 'ViewContent' | 'Lead' | 'Contact' | 'InitiateCheckout' | 'CompleteRegistration' | 'Search' | string,
  params?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
  }
) {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Client-side pixel (if loaded)
  if (typeof window !== 'undefined' && window.fbq) {
    const pixelParams: Record<string, any> = {};
    if (params?.value) pixelParams.value = params.value;
    if (params?.currency) pixelParams.currency = params.currency;
    if (params?.content_name) pixelParams.content_name = params.content_name;
    if (params?.content_category) pixelParams.content_category = params.content_category;
    if (params?.content_ids) pixelParams.content_ids = params.content_ids;
    pixelParams.eventID = eventId; // For deduplication with CAPI

    window.fbq('track', eventName, pixelParams, { eventID: eventId });
  }

  // 2. Server-side CAPI (more reliable, bypasses ad blockers)
  try {
    // Get fbp and fbc cookies for matching
    const fbp = getCookie('_fbp');
    const fbc = getCookie('_fbc') || getFbcFromUrl();

    await supabase.functions.invoke('facebook-capi', {
      body: {
        event_name: eventName,
        event_id: eventId,
        source_url: window.location.href,
        user_data: {
          email: params?.email,
          phone: params?.phone,
          first_name: params?.first_name,
          last_name: params?.last_name,
          client_ip: undefined, // Will be detected server-side
          user_agent: navigator.userAgent,
          fbc,
          fbp,
        },
        custom_data: {
          value: params?.value,
          currency: params?.currency || 'EUR',
          content_name: params?.content_name,
          content_category: params?.content_category,
          content_ids: params?.content_ids,
        },
      },
    });
  } catch (err) {
    // Silently fail — tracking should never break the app
    console.warn('CAPI tracking failed:', err);
  }
}

// ─── Convenience methods ───

/** Track page view (call on route change) */
export function trackPageView() {
  trackFBEvent('PageView');
}

/** Track when user views offer/product */
export function trackViewContent(name: string, category?: string, value?: number) {
  trackFBEvent('ViewContent', { content_name: name, content_category: category, value, currency: 'EUR' });
}

/** Track when user submits a contact form / becomes a lead */
export function trackLead(email?: string, phone?: string, firstName?: string) {
  trackFBEvent('Lead', { email, phone, first_name: firstName });
}

/** Track when user clicks phone/email/whatsapp */
export function trackContact() {
  trackFBEvent('Contact');
}

/** Track when user starts configurator */
export function trackInitiateCheckout(productName: string, value?: number) {
  trackFBEvent('InitiateCheckout', { content_name: productName, value, currency: 'EUR' });
}

// ─── Helpers ───

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match?.[2];
}

function getFbcFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get('fbclid');
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
  return undefined;
}
