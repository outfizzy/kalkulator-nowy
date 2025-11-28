// Distance calculation utility using Haversine formula
// Calculates approximate distance between two locations based on postal codes

interface Coordinates {
    lat: number;
    lng: number;
}

// Gubin coordinates (66-620)
const GUBIN_COORDS: Coordinates = {
    lat: 51.9494,
    lng: 14.7242
};

// German postal code to approximate coordinates mapping
// This is a simplified mapping - for production, use a proper geocoding service
const GERMAN_POSTAL_REGIONS: Record<string, Coordinates> = {
    // Berlin area (10xxx-14xxx)
    '10': { lat: 52.52, lng: 13.405 },
    '11': { lat: 52.52, lng: 13.405 },
    '12': { lat: 52.52, lng: 13.405 },
    '13': { lat: 52.52, lng: 13.405 },
    '14': { lat: 52.52, lng: 13.405 },

    // Hamburg (20xxx-22xxx)
    '20': { lat: 53.5511, lng: 9.9937 },
    '21': { lat: 53.5511, lng: 9.9937 },
    '22': { lat: 53.5511, lng: 9.9937 },

    // Munich (80xxx-81xxx)
    '80': { lat: 48.1351, lng: 11.582 },
    '81': { lat: 48.1351, lng: 11.582 },

    // Cologne (50xxx-51xxx)
    '50': { lat: 50.9375, lng: 6.9603 },
    '51': { lat: 50.9375, lng: 6.9603 },

    // Frankfurt (60xxx-61xxx)
    '60': { lat: 50.1109, lng: 8.6821 },
    '61': { lat: 50.1109, lng: 8.6821 },

    // Add more regions as needed
};

/**
 * Haversine formula to calculate distance between two points on Earth
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
}

/**
 * Get approximate coordinates for a German postal code
 * @param postalCode German postal code (5 digits)
 * @returns Coordinates object or null if not found
 */
function getCoordinatesFromPostalCode(postalCode: string): Coordinates | null {
    if (!postalCode || postalCode.length !== 5) {
        return null;
    }

    // Try 2-digit prefix first (most specific)
    const prefix2 = postalCode.substring(0, 2);
    if (GERMAN_POSTAL_REGIONS[prefix2]) {
        return GERMAN_POSTAL_REGIONS[prefix2];
    }

    // Try 1-digit prefix
    const prefix1 = postalCode.substring(0, 1);
    if (GERMAN_POSTAL_REGIONS[prefix1]) {
        return GERMAN_POSTAL_REGIONS[prefix1];
    }

    // Default to Berlin if no match (central Germany)
    return { lat: 52.52, lng: 13.405 };
}

/**
 * Calculate distance from Gubin to customer location
 * @param customerPostalCode Customer's German postal code
 * @returns Estimated distance in kilometers, or null if calculation not possible
 */
export function calculateDistanceFromGubin(customerPostalCode: string): number | null {
    const customerCoords = getCoordinatesFromPostalCode(customerPostalCode);

    if (!customerCoords) {
        return null;
    }

    const distance = haversineDistance(
        GUBIN_COORDS.lat,
        GUBIN_COORDS.lng,
        customerCoords.lat,
        customerCoords.lng
    );

    // Add 20% to account for road distance vs straight line
    return Math.round(distance * 1.2);
}

/**
 * Calculate installation costs based on days and distance
 * @param days Number of installation days (0-3)
 * @param distanceKm Distance in kilometers
 * @returns Installation cost breakdown
 */
export interface InstallationCosts {
    days: number;
    dailyBreakdown: { day: number; cost: number }[];
    dailyTotal: number;
    travelDistance: number;
    travelCost: number;
    totalInstallation: number;
}

// Installation daily rates (GROSS prices including VAT)
// Day 1: €1,250, Day 2: €830, Day 3: €790
// For days 4+: €790 per day
const DAILY_RATES = [1250, 830, 790]; // First 3 days
const ADDITIONAL_DAY_RATE = 790; // Day 4 and beyond
const TRAVEL_RATE = 0.50; // EUR per km (one way)

export function calculateInstallationCosts(days: number, distanceKm: number): InstallationCosts {
    const validDays = Math.max(0, days); // Allow any number of days

    const dailyBreakdown = [];
    let dailyTotal = 0;

    for (let i = 0; i < validDays; i++) {
        // First 3 days use DAILY_RATES, after that use ADDITIONAL_DAY_RATE
        const cost = i < DAILY_RATES.length ? DAILY_RATES[i] : ADDITIONAL_DAY_RATE;
        dailyBreakdown.push({ day: i + 1, cost });
        dailyTotal += cost;
    }

    const travelCost = Math.round(distanceKm * TRAVEL_RATE * 100) / 100; // Round to cents

    return {
        days: validDays,
        dailyBreakdown,
        dailyTotal,
        travelDistance: distanceKm,
        travelCost,
        totalInstallation: dailyTotal + travelCost
    };
}
