interface Coordinates {
    lat: number;
    lng: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCbhKLr6dhJCDpo-YeWSPh32UQvGLf48_E';

/**
 * Geocodes an address string to coordinates using Google Geocoding API.
 */
export async function geocodeAddress(address: string, city: string = ''): Promise<Coordinates | null> {
    try {
        const query = city ? `${address}, ${city}` : address;
        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        url.searchParams.set('address', query);
        url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
        url.searchParams.set('language', 'de');

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error('Google Geocoding API failed');
        }

        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            return {
                lat: loc.lat,
                lng: loc.lng
            };
        }

        return null;
    } catch (error) {
        console.error('Google Geocoding error:', error);
        return null;
    }
}
