/**
 * Exchange Rate Service — NBP (Narodowy Bank Polski) API
 * Fetches live EUR/PLN rate with 1-hour cache to avoid excessive API calls.
 * Fallback to 4.30 if API is unreachable.
 */

const FALLBACK_RATE = 4.30;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

let cachedRate: number | null = null;
let cachedAt: number = 0;

/**
 * Get the current EUR/PLN exchange rate from NBP.
 * Returns the mid-rate (kurs średni). Cached for 1 hour.
 */
export async function getEurPlnRate(): Promise<number> {
    const now = Date.now();

    // Return cached value if still fresh
    if (cachedRate !== null && (now - cachedAt) < CACHE_DURATION_MS) {
        return cachedRate;
    }

    try {
        const response = await fetch(
            'https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json',
            { signal: AbortSignal.timeout(5000) } // 5s timeout
        );

        if (!response.ok) {
            throw new Error(`NBP API returned ${response.status}`);
        }

        const data = await response.json();
        const rate = data?.rates?.[0]?.mid;

        if (typeof rate === 'number' && rate > 0) {
            cachedRate = rate;
            cachedAt = now;
            console.log(`[ExchangeRate] NBP EUR/PLN: ${rate}`);
            return rate;
        }

        throw new Error('Invalid rate data from NBP');
    } catch (err) {
        console.warn('[ExchangeRate] NBP API error, using fallback:', err);
        // If we have an expired cache, still use it over fallback
        if (cachedRate !== null) {
            return cachedRate;
        }
        return FALLBACK_RATE;
    }
}
