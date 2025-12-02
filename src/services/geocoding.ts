// Geocoding service for converting addresses to coordinates
// Using Google Maps Geocoding API

interface GeocodingResult {
    lat: number;
    lng: number;
    formattedAddress: string;
}

interface RouteSegment {
    distance: number; // in kilometers
    duration: number; // in minutes
}

class GeocodingService {
    private apiKey: string;

    constructor() {
        // Get API key from environment variable
        this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    }

    /**
     * Geocode an address to get latitude and longitude
     */
    async geocodeAddress(address: string): Promise<GeocodingResult | null> {
        if (!this.apiKey) {
            console.warn('Google Maps API key not configured');
            return null;
        }

        try {
            const encodedAddress = encodeURIComponent(address);
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                return {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    formattedAddress: result.formatted_address
                };
            }

            console.error('Geocoding failed:', data.status);
            return null;
        } catch (error) {
            console.error('Error geocoding address:', error);
            return null;
        }
    }

    /**
     * Calculate distance and duration between two points
     */
    async calculateRoute(
        origin: { lat: number; lng: number },
        destination: { lat: number; lng: number }
    ): Promise<RouteSegment | null> {
        if (!this.apiKey) {
            console.warn('Google Maps API key not configured');
            return null;
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${this.apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.routes.length > 0) {
                const route = data.routes[0];
                const leg = route.legs[0];

                return {
                    distance: leg.distance.value / 1000, // convert meters to km
                    duration: Math.ceil(leg.duration.value / 60) // convert seconds to minutes
                };
            }

            console.error('Route calculation failed:', data.status);
            return null;
        } catch (error) {
            console.error('Error calculating route:', error);
            return null;
        }
    }

    /**
     * Optimize route order using nearest neighbor algorithm
     * Returns optimized array of indices
     */
    optimizeRoute(
        points: Array<{ lat: number; lng: number; id: string }>
    ): string[] {
        if (points.length <= 2) {
            return points.map(p => p.id);
        }

        const unvisited = [...points];
        const route: string[] = [];

        // Start with first point
        let current = unvisited.shift()!;
        route.push(current.id);

        // Nearest neighbor algorithm
        while (unvisited.length > 0) {
            let nearestIndex = 0;
            let nearestDistance = this.calculateDistance(current, unvisited[0]);

            for (let i = 1; i < unvisited.length; i++) {
                const distance = this.calculateDistance(current, unvisited[i]);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }

            current = unvisited.splice(nearestIndex, 1)[0];
            route.push(current.id);
        }

        return route;
    }

    /**
     * Calculate straight-line distance between two points (Haversine formula)
     */
    private calculateDistance(
        point1: { lat: number; lng: number },
        point2: { lat: number; lng: number }
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLon = this.toRad(point2.lng - point1.lng);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.lat)) *
            Math.cos(this.toRad(point2.lat)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}

export const geocodingService = new GeocodingService();
export type { GeocodingResult, RouteSegment };
