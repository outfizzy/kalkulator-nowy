/**
 * Map Geocoding Service — Google Maps API
 * Uses Google Geocoding API with localStorage cache and PLZ fallback.
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCbhKLr6dhJCDpo-YeWSPh32UQvGLf48_E';

export interface MapGeoResult {
    lat: number;
    lng: number;
    source: 'exact' | 'plz' | 'city' | 'cached';
}

// Persistent cache
const GEO_CACHE_KEY = 'map_geo_cache_v3';
const geoCache = new Map<string, MapGeoResult>();

try {
    const saved = localStorage.getItem(GEO_CACHE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved) as Record<string, MapGeoResult>;
        Object.entries(parsed).forEach(([k, v]) => geoCache.set(k, v));
    }
} catch { /* ignore */ }

const persistCache = () => {
    try {
        const obj: Record<string, MapGeoResult> = {};
        geoCache.forEach((v, k) => { obj[k] = v; });
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(obj));
    } catch { /* ignore */ }
};

const googleGeocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        url.searchParams.set('address', address);
        url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
        url.searchParams.set('language', 'de');
        const res = await fetch(url.toString());
        if (!res.ok) return null;
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
            const loc = data.results[0].geometry.location;
            return { lat: loc.lat, lng: loc.lng };
        }
    } catch { /* ignore */ }
    return null;
};

/**
 * Geocode a single address. Tries full address → PLZ → city as fallbacks.
 */
export const geocodeForMap = async (
    address?: string,
    city?: string,
    postalCode?: string,
    country = 'DE'
): Promise<MapGeoResult | null> => {
    const parts = [address, postalCode, city, country].filter(Boolean);
    const key = parts.join('|').toLowerCase().trim();
    if (key.length < 3) return null;

    if (geoCache.has(key)) return { ...geoCache.get(key)!, source: 'cached' };

    // Full address
    const fullQ = parts.join(', ');
    const exact = await googleGeocode(fullQ);
    if (exact) {
        const r: MapGeoResult = { ...exact, source: 'exact' };
        geoCache.set(key, r); persistCache();
        return r;
    }

    // PLZ fallback
    if (postalCode) {
        const plzKey = `${postalCode}|${country}`.toLowerCase();
        if (geoCache.has(plzKey)) { const c = geoCache.get(plzKey)!; geoCache.set(key, c); persistCache(); return { ...c, source: 'cached' }; }
        const plz = await googleGeocode(`${postalCode}, ${country}`);
        if (plz) {
            const r: MapGeoResult = { ...plz, source: 'plz' };
            geoCache.set(key, r); geoCache.set(plzKey, r); persistCache();
            return r;
        }
    }

    // City fallback
    if (city) {
        const cityKey = `${city}|${country}`.toLowerCase();
        if (geoCache.has(cityKey)) { const c = geoCache.get(cityKey)!; geoCache.set(key, c); persistCache(); return { ...c, source: 'cached' }; }
        const c = await googleGeocode(`${city}, ${country}`);
        if (c) {
            const r: MapGeoResult = { ...c, source: 'city' };
            geoCache.set(key, r); geoCache.set(cityKey, r); persistCache();
            return r;
        }
    }

    return null;
};

/**
 * Batch geocode items. Items with existing lat/lng skip the API.
 */
export const batchGeocodeForMap = async (
    items: Array<{ id: string; address?: string; city?: string; postalCode?: string; lat?: number; lng?: number }>,
    onProgress?: (done: number, total: number) => void
): Promise<Map<string, MapGeoResult>> => {
    const results = new Map<string, MapGeoResult>();
    const needsGeocoding: typeof items = [];

    for (const item of items) {
        if (item.lat && item.lng && item.lat !== 0 && item.lng !== 0) {
            results.set(item.id, { lat: item.lat, lng: item.lng, source: 'exact' });
        } else {
            needsGeocoding.push(item);
        }
    }

    let done = results.size;
    for (const item of needsGeocoding) {
        const geo = await geocodeForMap(item.address, item.city, item.postalCode);
        if (geo) results.set(item.id, geo);
        done++;
        onProgress?.(done, items.length);
    }

    return results;
};

/**
 * Haversine distance in km
 */
export const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Load Google Maps JS API dynamically
 */
let mapsLoadPromise: Promise<void> | null = null;
export const loadGoogleMapsAPI = (): Promise<void> => {
    if ((window as any).google?.maps) return Promise.resolve();
    if (mapsLoadPromise) return mapsLoadPromise;

    mapsLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps API'));
        document.head.appendChild(script);
    });

    return mapsLoadPromise;
};
