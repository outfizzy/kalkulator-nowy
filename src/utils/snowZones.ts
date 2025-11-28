export interface SnowZone {
    id: string;
    value: number;
    description: string;
}

export function getSnowZone(postalCode: string): SnowZone {
    // Simplified German Snow Zones based on first digit of PLZ
    // This is a rough approximation. Real data would require a huge database.


    const firstTwoDigits = parseInt(postalCode.substring(0, 2));

    // Zone 3 (High snow load) - Alps, Black Forest, etc.
    if ((firstTwoDigits >= 80 && firstTwoDigits <= 87) || (firstTwoDigits >= 94 && firstTwoDigits <= 99)) {
        return { id: '3', value: 1.10, description: 'Strefa 3 (Wysokie obciążenie)' };
    }

    // Zone 2 (Medium)
    if ((firstTwoDigits >= 70 && firstTwoDigits <= 79) || (firstTwoDigits >= 88 && firstTwoDigits <= 93) || (firstTwoDigits >= 35 && firstTwoDigits <= 36)) {
        return { id: '2', value: 0.85, description: 'Strefa 2 (Średnie obciążenie)' };
    }

    // Zone 1 (Low) - North, West
    return { id: '1', value: 0.65, description: 'Strefa 1 (Niskie obciążenie)' };
}
