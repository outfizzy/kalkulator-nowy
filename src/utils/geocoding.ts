
interface Coordinates {
    lat: number;
    lng: number;
}

/**
 * Geocodes an address string to coordinates using OpenStreetMap Nominatim API.
 * Note: Nominatim Usage Policy requires max 1 request per second.
 */
export async function geocodeAddress(address: string, city: string): Promise<Coordinates | null> {
    try {
        const query = encodeURIComponent(`${address}, ${city}`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'OfferApp/1.0' // Required by Nominatim policy
            }
        });

        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }

        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}
