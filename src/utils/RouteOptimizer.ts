
import type { Measurement } from '../types';

export const RouteOptimizer = {
    /**
     * Optimizes the route using a simple Greedy Nearest Neighbor algorithm.
     * Starts from the point with orderInRoute=1 (or the first one if not set), 
     * or implies a starting depot (not implemented here, assuming first point is start).
     */
    optimize: (measurements: Measurement[]): Measurement[] => {
        if (measurements.length <= 1) return measurements;

        const validPoints = measurements.filter(m => m.locationLat && m.locationLng);
        const invalidPoints = measurements.filter(m => !m.locationLat || !m.locationLng);

        if (validPoints.length === 0) return measurements;

        // Clone to avoid mutation
        const unvisited = [...validPoints];

        // Find start point: 
        // If any point has orderInRoute explicitly set to 1, use it.
        // Otherwise, use the one with earliest scheduled time.
        let current = unvisited.sort((a, b) => {
            if (a.orderInRoute === 1) return -1;
            if (b.orderInRoute === 1) return 1;
            return a.scheduledDate.getTime() - b.scheduledDate.getTime();
        })[0];

        const route: Measurement[] = [current];
        unvisited.splice(unvisited.indexOf(current), 1);



        while (unvisited.length > 0) {
            let nearest: Measurement | null = null;
            let minDist = Infinity;
            let nearestIdx = -1;

            for (let i = 0; i < unvisited.length; i++) {
                const candidate = unvisited[i];
                const dist = calculateDistance(
                    current.locationLat!,
                    current.locationLng!,
                    candidate.locationLat!,
                    candidate.locationLng!
                );

                if (dist < minDist) {
                    minDist = dist;
                    nearest = candidate;
                    nearestIdx = i;
                }
            }

            if (nearest && nearestIdx !== -1) {
                nearest.distanceFromPrevious = Math.round(minDist * 10) / 10;
                // totalDistance += nearest.distanceFromPrevious;

                route.push(nearest);
                current = nearest;
                unvisited.splice(nearestIdx, 1);
            } else {
                break; // Should not happen
            }
        }

        // Re-assign orderInRoute
        const optimizedRoute = route.map((m, index) => ({
            ...m,
            orderInRoute: index + 1
        }));

        return [...optimizedRoute, ...invalidPoints];
    },

    calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        return calculateDistance(lat1, lon1, lat2, lon2);
    }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}
