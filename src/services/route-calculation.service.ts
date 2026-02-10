import { supabase } from '../lib/supabase';

export interface RouteData {
    distance_km: number;
    duration_minutes: number;
    polyline: string;
    destination_address: string;
    destination_lat: number;
    destination_lng: number;
}

export interface MeasurementRoute {
    id: string;
    measurement_id: string;
    origin_address: string;
    destination_address: string;
    distance_km: number;
    duration_minutes: number;
    route_polyline: string | null;
    fuel_price_per_liter: number | null;
    fuel_consumption_liters: number;
    fuel_cost: number | null;
    calculated_at: string;
}

export interface MeasurementCost {
    distance_km: number;
    fuel_consumption_liters: number;
    fuel_price_per_liter: number | null;
    fuel_cost: number | null;
    duration_minutes: number;
}

export class RouteCalculationService {
    private static readonly ORIGIN = 'Gubin 66-620, Poland';
    private static readonly FUEL_CONSUMPTION_RATE = 0.08; // 8L per 100km
    private static readonly GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    /**
     * Calculate route from Gubin to destination using Google Maps Directions API
     */
    static async calculateRoute(destinationAddress: string): Promise<RouteData> {
        if (!this.GOOGLE_MAPS_API_KEY) {
            throw new Error('Google Maps API key not configured');
        }

        try {
            const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
            url.searchParams.append('origin', this.ORIGIN);
            url.searchParams.append('destination', destinationAddress);
            url.searchParams.append('mode', 'driving');
            url.searchParams.append('key', this.GOOGLE_MAPS_API_KEY);
            // Note: avoid=tolls can be added if you want to avoid highways
            // url.searchParams.append('avoid', 'tolls');

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Google Maps API error: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
                throw new Error(`No route found: ${data.status}`);
            }

            const route = data.routes[0];
            const leg = route.legs[0];

            return {
                distance_km: leg.distance.value / 1000, // Convert meters to km
                duration_minutes: Math.round(leg.duration.value / 60), // Convert seconds to minutes
                polyline: route.overview_polyline.points,
                destination_address: leg.end_address,
                destination_lat: leg.end_location.lat,
                destination_lng: leg.end_location.lng
            };
        } catch (error) {
            console.error('Error calculating route:', error);
            throw error;
        }
    }

    /**
     * Get fuel price for a specific date from fuel_prices table
     */
    static async getFuelPriceForDate(date: string): Promise<number | null> {
        try {
            const { data, error } = await supabase
                .from('fuel_prices')
                .select('price_per_liter')
                .lte('valid_from', date)
                .or(`valid_to.is.null,valid_to.gte.${date}`)
                .order('valid_from', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data?.price_per_liter || null;
        } catch (error) {
            console.error('Error fetching fuel price:', error);
            return null;
        }
    }

    /**
     * Calculate and save route for a measurement
     */
    static async calculateAndSaveRoute(
        measurementId: string,
        destinationAddress: string,
        measurementDate: string
    ): Promise<MeasurementRoute> {
        try {
            // 1. Calculate route
            const routeData = await this.calculateRoute(destinationAddress);

            // 2. Get fuel price for measurement date
            const fuelPrice = await this.getFuelPriceForDate(measurementDate);

            // 3. Save to database
            const { data, error } = await supabase
                .from('measurement_routes')
                .insert({
                    measurement_id: measurementId,
                    destination_address: routeData.destination_address,
                    distance_km: routeData.distance_km,
                    duration_minutes: routeData.duration_minutes,
                    route_polyline: routeData.polyline,
                    fuel_price_per_liter: fuelPrice
                })
                .select()
                .single();

            if (error) throw error;

            // 4. Update measurement with route_id and GPS coordinates
            await supabase
                .from('measurements')
                .update({
                    route_id: data.id,
                    location_lat: routeData.destination_lat,
                    location_lng: routeData.destination_lng
                })
                .eq('id', measurementId);

            return data;
        } catch (error) {
            console.error('Error calculating and saving route:', error);
            throw error;
        }
    }

    /**
     * Get route for a measurement
     */
    static async getRouteForMeasurement(measurementId: string): Promise<MeasurementRoute | null> {
        try {
            const { data, error } = await supabase
                .from('measurement_routes')
                .select('*')
                .eq('measurement_id', measurementId)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching route:', error);
            return null;
        }
    }

    /**
     * Calculate total cost for a measurement (route + time)
     */
    static async calculateMeasurementCost(measurementId: string): Promise<MeasurementCost | null> {
        try {
            const route = await this.getRouteForMeasurement(measurementId);

            if (!route) {
                return null;
            }

            return {
                distance_km: route.distance_km,
                fuel_consumption_liters: route.fuel_consumption_liters,
                fuel_price_per_liter: route.fuel_price_per_liter,
                fuel_cost: route.fuel_cost,
                duration_minutes: route.duration_minutes
            };
        } catch (error) {
            console.error('Error calculating measurement cost:', error);
            return null;
        }
    }

    /**
     * Recalculate fuel cost for existing route (e.g., if price changes)
     */
    static async recalculateFuelCost(routeId: string, newPricePerLiter: number): Promise<void> {
        try {
            await supabase
                .from('measurement_routes')
                .update({ fuel_price_per_liter: newPricePerLiter })
                .eq('id', routeId);
        } catch (error) {
            console.error('Error recalculating fuel cost:', error);
            throw error;
        }
    }

    /**
     * Get daily summary of routes (total distance, fuel, cost)
     */
    static async getDailySummary(date: string): Promise<{
        total_distance_km: number;
        total_fuel_liters: number;
        total_cost: number;
        measurement_count: number;
    }> {
        try {
            const { data, error } = await supabase
                .from('measurements')
                .select(`
                    id,
                    route:measurement_routes(
                        distance_km,
                        fuel_consumption_liters,
                        fuel_cost
                    )
                `)
                .gte('scheduled_date', `${date}T00:00:00`)
                .lt('scheduled_date', `${date}T23:59:59`);

            if (error) throw error;

            const summary = (data || []).reduce((acc, measurement: any) => {
                if (measurement.route) {
                    acc.total_distance_km += measurement.route.distance_km || 0;
                    acc.total_fuel_liters += measurement.route.fuel_consumption_liters || 0;
                    acc.total_cost += measurement.route.fuel_cost || 0;
                    acc.measurement_count += 1;
                }
                return acc;
            }, {
                total_distance_km: 0,
                total_fuel_liters: 0,
                total_cost: 0,
                measurement_count: 0
            });

            return summary;
        } catch (error) {
            console.error('Error calculating daily summary:', error);
            return {
                total_distance_km: 0,
                total_fuel_liters: 0,
                total_cost: 0,
                measurement_count: 0
            };
        }
    }
}
