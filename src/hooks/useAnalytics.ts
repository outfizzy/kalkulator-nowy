/**
 * Google Analytics 4 — Custom Event Tracking Hook
 * 
 * Usage:
 *   import { trackEvent, trackConversion, trackPageView } from '../hooks/useAnalytics';
 *   trackEvent('offer_created', { model: 'Trendstyle', value: 5000 });
 *   trackConversion('contract_signed', 12500);
 */

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
        dataLayer: any[];
    }
}

const GA_MEASUREMENT_ID = 'G-52337R5NNZ';

// ─── Core gtag wrapper ──────────────────────────────────────
function gtag(...args: any[]) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag(...args);
    }
}

// ─── Page View ──────────────────────────────────────────────
export function trackPageView(path: string, title?: string) {
    gtag('config', GA_MEASUREMENT_ID, {
        page_path: path,
        page_title: title || document.title,
    });
}

// ─── Custom Event ───────────────────────────────────────────
export function trackEvent(
    eventName: string,
    params?: Record<string, any>
) {
    gtag('event', eventName, {
        ...params,
        send_to: GA_MEASUREMENT_ID,
    });
}

// ─── Conversion Event (with value) ─────────────────────────
export function trackConversion(
    eventName: string,
    value?: number,
    currency: string = 'EUR'
) {
    gtag('event', eventName, {
        value: value,
        currency: currency,
        send_to: GA_MEASUREMENT_ID,
    });
}

// ─── Pre-defined Business Events ────────────────────────────

/** Track when a new offer is created */
export function trackOfferCreated(model: string, value?: number) {
    trackEvent('offer_created', {
        item_name: model,
        value,
        currency: 'EUR',
        content_type: 'offer'
    });
}

/** Track when an offer is sent to a client */
export function trackOfferSent(offerId: string, value?: number) {
    trackConversion('offer_sent', value);
    trackEvent('offer_sent', { offer_id: offerId });
}

/** Track when a contract is signed */
export function trackContractSigned(value: number) {
    trackConversion('contract_signed', value);
}

/** Track when a lead is created */
export function trackLeadCreated(source: string) {
    trackEvent('lead_created', { lead_source: source });
}

/** Track when a measurement is scheduled */
export function trackMeasurementScheduled() {
    trackEvent('measurement_scheduled');
}

/** Track when a user searches for something */
export function trackSearch(query: string) {
    trackEvent('search', { search_term: query });
}

/** Track CTA clicks */
export function trackCTAClick(ctaName: string, page: string) {
    trackEvent('cta_click', { cta_name: ctaName, page_location: page });
}

/** Track AI usage */
export function trackAIUsage(action: string, context?: string) {
    trackEvent('ai_interaction', { action, context });
}

// ─── Google Ads Conversion ──────────────────────────────────
const GOOGLE_ADS_ID = 'AW-4384257139'; // 438-425-7139

export function trackAdsConversion(conversionLabel: string, value?: number) {
    gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_ID}/${conversionLabel}`,
        value: value,
        currency: 'EUR',
    });
}
