/**
 * Weather Service — Open-Meteo (free, no API key)
 * Provides 7-day weather forecast for installation calendar
 */

// ── WMO Weather Code → Emoji + Label mapping ──────────────────────
interface WeatherInfo {
    icon: string;
    label: string;
    severity: 'good' | 'moderate' | 'bad';
}

const WMO_CODES: Record<number, WeatherInfo> = {
    0: { icon: '☀️', label: 'Bezchmurnie', severity: 'good' },
    1: { icon: '🌤️', label: 'Prawie bezchmurnie', severity: 'good' },
    2: { icon: '⛅', label: 'Częściowe zachmurzenie', severity: 'good' },
    3: { icon: '☁️', label: 'Pochmurno', severity: 'moderate' },
    45: { icon: '🌫️', label: 'Mgła', severity: 'moderate' },
    48: { icon: '🌫️', label: 'Szadź', severity: 'moderate' },
    51: { icon: '🌦️', label: 'Mżawka lekka', severity: 'moderate' },
    53: { icon: '🌦️', label: 'Mżawka', severity: 'moderate' },
    55: { icon: '🌧️', label: 'Mżawka gęsta', severity: 'bad' },
    56: { icon: '🌧️', label: 'Marznąca mżawka', severity: 'bad' },
    57: { icon: '🌧️', label: 'Marznąca mżawka gęsta', severity: 'bad' },
    61: { icon: '🌧️', label: 'Lekki deszcz', severity: 'moderate' },
    63: { icon: '🌧️', label: 'Deszcz', severity: 'bad' },
    65: { icon: '🌧️', label: 'Ulewa', severity: 'bad' },
    66: { icon: '🌧️', label: 'Marznący deszcz', severity: 'bad' },
    67: { icon: '🌧️', label: 'Marznący deszcz silny', severity: 'bad' },
    71: { icon: '🌨️', label: 'Lekki śnieg', severity: 'moderate' },
    73: { icon: '🌨️', label: 'Śnieg', severity: 'bad' },
    75: { icon: '❄️', label: 'Intensywny śnieg', severity: 'bad' },
    77: { icon: '❄️', label: 'Ziarna śniegu', severity: 'bad' },
    80: { icon: '🌦️', label: 'Przelotny deszcz lekki', severity: 'moderate' },
    81: { icon: '🌧️', label: 'Przelotny deszcz', severity: 'bad' },
    82: { icon: '⛈️', label: 'Przelotny deszcz silny', severity: 'bad' },
    85: { icon: '🌨️', label: 'Przelotny śnieg', severity: 'bad' },
    86: { icon: '❄️', label: 'Przelotny śnieg silny', severity: 'bad' },
    95: { icon: '⛈️', label: 'Burza', severity: 'bad' },
    96: { icon: '⛈️', label: 'Burza z gradem lekkim', severity: 'bad' },
    99: { icon: '⛈️', label: 'Burza z gradem silnym', severity: 'bad' },
};

export function getWeatherInfo(code: number): WeatherInfo {
    return WMO_CODES[code] || { icon: '❓', label: 'Nieznana', severity: 'moderate' as const };
}

// ── Types ──────────────────────────────────────────────────────────

export interface DailyForecast {
    date: string; // YYYY-MM-DD
    weatherCode: number;
    tempMax: number;
    tempMin: number;
    info: WeatherInfo;
}

export interface LocationForecast {
    lat: number;
    lng: number;
    city: string;
    forecasts: Record<string, DailyForecast>; // keyed by date string
}

// ── In-memory cache ───────────────────────────────────────────────

const forecastCache: Map<string, { data: LocationForecast; fetchedAt: number }> = new Map();
const geocodeCache: Map<string, { lat: number; lng: number } | null> = new Map();

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

// ── Geocoding ─────────────────────────────────────────────────────

export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
    if (!city) return null;

    const normalizedCity = city.trim().toLowerCase();
    if (geocodeCache.has(normalizedCity)) {
        return geocodeCache.get(normalizedCity) || null;
    }

    try {
        const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pl&format=json`
        );
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            geocodeCache.set(normalizedCity, null);
            return null;
        }

        const coords = { lat: data.results[0].latitude, lng: data.results[0].longitude };
        geocodeCache.set(normalizedCity, coords);
        return coords;
    } catch (err) {
        console.error('Geocoding error for', city, err);
        return null;
    }
}

// ── Forecast Fetching ─────────────────────────────────────────────

export async function fetchForecast(lat: number, lng: number, city: string): Promise<LocationForecast | null> {
    const key = getCacheKey(lat, lng);
    const cached = forecastCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return cached.data;
    }

    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FWarsaw&forecast_days=7`
        );
        if (!res.ok) {
            console.warn(`Weather API returned ${res.status} for ${city}`);
            return null;
        }

        const data = await res.json();
        const forecasts: Record<string, DailyForecast> = {};

        if (data.daily) {
            const { time, temperature_2m_max, temperature_2m_min } = data.daily;
            // Handle both old 'weathercode' and new 'weather_code' field names
            const codes = data.daily.weather_code || data.daily.weathercode || [];
            for (let i = 0; i < time.length; i++) {
                forecasts[time[i]] = {
                    date: time[i],
                    weatherCode: codes[i] ?? 0,
                    tempMax: Math.round(temperature_2m_max[i]),
                    tempMin: Math.round(temperature_2m_min[i]),
                    info: getWeatherInfo(codes[i] ?? 0),
                };
            }
        }

        const result: LocationForecast = { lat, lng, city, forecasts };
        forecastCache.set(key, { data: result, fetchedAt: Date.now() });
        return result;
    } catch (err) {
        console.error('Forecast fetch error for', city, ':', err);
        return null;
    }
}

// ── Main entry: get weather for multiple installations ────────────

interface InstallationLocation {
    id: string;
    city: string;
    coordinates?: { lat: number; lng: number };
}

export async function getWeatherForInstallations(
    installations: InstallationLocation[]
): Promise<Map<string, LocationForecast>> {
    // Group by city to avoid duplicate requests
    const cityMap = new Map<string, InstallationLocation>();
    for (const inst of installations) {
        const cityKey = inst.city?.trim().toLowerCase();
        if (cityKey && !cityMap.has(cityKey)) {
            cityMap.set(cityKey, inst);
        }
    }

    const results = new Map<string, LocationForecast>();

    // Fetch forecasts in parallel (max 5 at a time to be nice to the API)
    const entries = Array.from(cityMap.entries());

    for (let i = 0; i < entries.length; i += 5) {
        const batch = entries.slice(i, i + 5);
        const promises = batch.map(async ([cityKey, inst]) => {
            // Always geocode by city name — stored coordinates may be inaccurate
            const coords = await geocodeCity(inst.city);
            if (!coords) return;

            const forecast = await fetchForecast(coords.lat, coords.lng, inst.city);
            if (forecast) {
                results.set(cityKey, forecast);
            }
        });

        await Promise.all(promises);
    }

    return results;
}
