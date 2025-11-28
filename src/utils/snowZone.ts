import type { SnowZone, SnowZoneInfo } from '../types';

export const SNOW_ZONES: Record<SnowZone, SnowZoneInfo> = {
    '1': { id: '1', value: 0.65, description: 'Strefa 1 (niska)' },
    '2': { id: '2', value: 0.85, description: 'Strefa 2 (średnia)' },
    '3': { id: '3', value: 1.10, description: 'Strefa 3 (wysoka)' },
    'I': { id: 'I', value: 0.7, description: 'Strefa I - Zachodnia Polska' },
    'II': { id: 'II', value: 0.9, description: 'Strefa II - Centralna Polska' },
    'III': { id: 'III', value: 1.2, description: 'Strefa III - Wschodnia i Północna Polska' },
    'IV': { id: 'IV', value: 1.6, description: 'Strefa IV - Olsztyn i okolice' },
    'V': { id: 'V', value: 2.0, description: 'Strefa V - Tereny górskie' }, // Simplified value, can go higher
};

// Simplified mapping based on first two digits of postal code (PNA)
// This is an approximation.
const ZONE_MAPPING: Record<string, SnowZone> = {
    // Zone I
    '59': 'I', '60': 'I', '61': 'I', '62': 'I', '63': 'I', '64': 'I', '65': 'I', '66': 'I', '67': 'I', '68': 'I', '69': 'I',
    '70': 'I', '71': 'I', '72': 'I', '73': 'I', '74': 'I', '75': 'I', '76': 'I',
    '50': 'I', '51': 'I', '52': 'I', '53': 'I', '54': 'I', '55': 'I', '56': 'I', '57': 'I', '58': 'I',

    // Zone II
    '00': 'II', '01': 'II', '02': 'II', '03': 'II', '04': 'II', '05': 'II', '06': 'II', '07': 'II', '08': 'II', '09': 'II',
    '90': 'II', '91': 'II', '92': 'II', '93': 'II', '94': 'II', '95': 'II', '96': 'II', '97': 'II', '98': 'II', '99': 'II',
    '80': 'II', '81': 'II', '82': 'II', '83': 'II', '84': 'II', '85': 'II', '86': 'II', '87': 'II', '88': 'II', '89': 'II',
    '40': 'II', '41': 'II', '42': 'II', '43': 'II', '44': 'II', '45': 'II', '46': 'II', '47': 'II', '48': 'II', '49': 'II',
    '26': 'II', '27': 'II', '28': 'II', '29': 'II',

    // Zone III
    '10': 'III', '11': 'III', '12': 'III', '13': 'III', '14': 'III', '15': 'III', '16': 'III', '17': 'III', '18': 'III', '19': 'III',
    '20': 'III', '21': 'III', '22': 'III', '23': 'III', '24': 'III', '25': 'III',
    '30': 'III', '31': 'III', '32': 'III', '33': 'III', '35': 'III', '36': 'III', '37': 'III', '38': 'III', '39': 'III',
    '77': 'III', '78': 'III', '79': 'III',

    // Zone IV (Warmia i Mazury parts) - Overrides some of the above if more specific, but for now using prefix mapping
    // Note: Zone IV is specific to some areas in 10-19 range usually.
    // Let's adjust some III to IV for demonstration of logic if needed, or keep simple.
    // Realistically, IV is around Suwałki, Białystok.
    // Let's assign 16, 19 to IV for better accuracy.
    // '16': 'IV', '19': 'IV', // Re-assigning below

    // Zone V (Mountains)
    // '34': 'V', // Zakopane and surroundings
};

// Overrides for specific zones
ZONE_MAPPING['16'] = 'IV';
ZONE_MAPPING['19'] = 'IV';
ZONE_MAPPING['34'] = 'V';

export function getSnowZone(postalCode: string): SnowZoneInfo {
    // Format: XX-XXX
    const cleanCode = postalCode.replace(/[^0-9]/g, '');
    if (cleanCode.length < 2) {
        return SNOW_ZONES['II']; // Default to II (Central)
    }

    const prefix = cleanCode.substring(0, 2);
    const zoneId = ZONE_MAPPING[prefix] || 'II'; // Default to II

    return SNOW_ZONES[zoneId];
}
