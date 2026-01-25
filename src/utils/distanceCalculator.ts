// Distance calculation utility using Haversine formula
// Calculates approximate distance between two locations based on postal codes

interface Coordinates {
    lat: number;
    lng: number;
}

// Default Base Location (Gubin)
export const DEFAULT_BASE_LOCATION = {
    name: 'Gubin',
    postalCode: '66-620',
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

    // Generic 1-digit Fallbacks (Broad Coverage)
    '0': { lat: 51.0504, lng: 13.7373 }, // Dresden/Leipzig
    '1': { lat: 52.5200, lng: 13.4050 }, // Berlin/Potsdam
    '2': { lat: 53.0793, lng: 8.8017 },  // Bremen/Hamburg
    '3': { lat: 52.3759, lng: 9.7320 },  // Hanover
    '4': { lat: 51.5136, lng: 7.4653 },  // Dortmund/Essen
    '5': { lat: 50.9375, lng: 6.9603 },  // Cologne/Bonn
    '6': { lat: 50.1109, lng: 8.6821 },  // Frankfurt/Mannheim
    '7': { lat: 48.7758, lng: 9.1829 },  // Stuttgart/Freiburg
    '8': { lat: 48.1351, lng: 11.5820 }, // Munich
    '9': { lat: 49.4520, lng: 11.0768 }, // Nuremberg/Würzburg
};

/**
 * Haversine formula to calculate distance between two points on Earth
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Calculate distance from Base Location to customer location
 * @param customerPostalCode Customer's German postal code
 * @param baseLocation Optional base location override (default: Gubin)
 * @returns Estimated distance in kilometers, or null if calculation not possible
 */
export function calculateDistanceFromGubin(
    customerPostalCode: string,
    baseLocation: { lat: number; lng: number } = DEFAULT_BASE_LOCATION
): number | null {
    const customerCoords = getCoordinatesFromPostalCode(customerPostalCode);

    if (!customerCoords) {
        return null;
    }

    const distance = haversineDistance(
        baseLocation.lat,
        baseLocation.lng,
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

export type InstallationDailyRates = {
    day1: number;
    day2: number;
    day3: number;
    additional: number;
};

// Default daily rates (Tiered Pricing)
const DEFAULT_RATES: InstallationDailyRates = {
    day1: 1200,      // 1st day: 1200 EUR
    day2: 800,       // 2nd day: 800 EUR
    day3: 790,       // 3rd day: 790 EUR
    additional: 790  // 4th+ day: 790 EUR each
};

const DEFAULT_TRAVEL_RATE = 0.50; // EUR per km (one way)

export function calculateInstallationCosts(
    days: number,
    distanceKm: number,
    ratePerKm: number = DEFAULT_TRAVEL_RATE,
    customRates: InstallationDailyRates | null = null
): InstallationCosts {
    const validDays = Math.max(0, days); // Allow any number of days

    const dailyBreakdown = [];
    let dailyTotal = 0;

    const rates = customRates || DEFAULT_RATES;

    const dailyRates = [rates.day1, rates.day2, rates.day3];

    for (let i = 0; i < validDays; i++) {
        // First 3 days use defined dailyRates, after that use additional rate
        const cost = i < dailyRates.length ? dailyRates[i] : rates.additional;
        dailyBreakdown.push({ day: i + 1, cost });
        dailyTotal += cost;
    }

    const travelCost = Math.round(distanceKm * ratePerKm * 100) / 100; // Round to cents

    return {
        days: validDays,
        dailyBreakdown,
        dailyTotal,
        travelDistance: distanceKm,
        travelCost,
        totalInstallation: dailyTotal + travelCost
    };
}
