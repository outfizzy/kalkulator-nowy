/**
 * Google Geocoding Service — Auto-fill city from postal code
 * Uses Google Maps Geocoding API to resolve PLZ → City
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCbhKLr6dhJCDpo-YeWSPh32UQvGLf48_E';

interface GeoResult {
  city: string;
  state: string;
  country: string;
}

// In-memory cache to avoid repeated API calls
const cache = new Map<string, GeoResult | null>();

// Debounce timers per caller
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Lookup city by postal code using Google Geocoding API.
 * Returns null if not found or invalid.
 */
async function lookupCityRaw(postalCode: string, countryCode = 'DE'): Promise<GeoResult | null> {
  const cacheKey = `${countryCode}:${postalCode}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) || null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', `${postalCode}, ${countryCode}`);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('language', 'de');

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) {
      cache.set(cacheKey, null);
      return null;
    }

    const components = data.results[0].address_components || [];
    let city = '';
    let state = '';
    let country = '';

    for (const comp of components) {
      const types: string[] = comp.types || [];
      if (types.includes('locality')) {
        city = comp.long_name;
      } else if (!city && types.includes('postal_town')) {
        city = comp.long_name;
      } else if (!city && types.includes('sublocality_level_1')) {
        city = comp.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = comp.long_name;
      } else if (types.includes('country')) {
        country = comp.short_name;
      }
    }

    // Fallback: use formatted address if no locality found
    if (!city && data.results[0].formatted_address) {
      const parts = data.results[0].formatted_address.split(',');
      if (parts.length >= 2) {
        // Format is usually "PLZ City, State, Country"
        const firstPart = parts[0].trim();
        const cityFromAddr = firstPart.replace(/^\d{4,5}\s*/, '');
        if (cityFromAddr) city = cityFromAddr;
      }
    }

    const result: GeoResult = { city, state, country };
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[GeocodingService] Lookup failed:', err);
    return null;
  }
}

/**
 * Debounced city lookup. Waits 400ms after last call before executing.
 * @param postalCode - The postal code to look up
 * @param countryCode - Country code (default: DE)
 * @param callerId - Unique ID for debounce grouping (e.g., 'leadForm')
 */
export function lookupCity(
  postalCode: string,
  countryCode = 'DE',
  callerId = 'default'
): Promise<GeoResult | null> {
  // Validate: DE = 5 digits, PL = XX-XXX or XXXXX
  const cleaned = postalCode.replace(/[^0-9]/g, '');
  if (cleaned.length < 4 || cleaned.length > 5) return Promise.resolve(null);

  // For DE, require exactly 5 digits
  if (countryCode === 'DE' && cleaned.length !== 5) return Promise.resolve(null);

  return new Promise((resolve) => {
    const existing = timers.get(callerId);
    if (existing) clearTimeout(existing);

    timers.set(callerId, setTimeout(async () => {
      const result = await lookupCityRaw(postalCode, countryCode);
      resolve(result);
    }, 400));
  });
}

/**
 * Detect country code from postal code format
 */
export function detectCountryFromPLZ(plz: string): string {
  const cleaned = plz.replace(/[^0-9-]/g, '');
  // Polish format: XX-XXX
  if (/^\d{2}-\d{3}$/.test(cleaned) || /^\d{5}$/.test(cleaned)) {
    // Could be DE or PL - check range
    const num = parseInt(cleaned.replace('-', ''), 10);
    if (num >= 1000 && num <= 99999) {
      // DE: 01001–99998, PL: 00-001–99-999
      // If has dash, it's PL
      if (plz.includes('-')) return 'PL';
      return 'DE';
    }
  }
  return 'DE'; // default
}

export const GeocodingService = {
  lookupCity,
  detectCountryFromPLZ,
};
