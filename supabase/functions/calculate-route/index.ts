import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const GOOGLE_MAPS_API_KEY = 'AIzaSyCbhKLr6dhJCDpo-YeWSPh32UQvGLf48_E'
const ORIGIN = 'Gubin 66-620, Poland'
const FUEL_CONSUMPTION_RATE = 0.08 // 8L per 100km

interface RouteRequest {
    measurementId: string
    destinationAddress: string
    measurementDate: string
}

serve(async (req) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        const { measurementId, destinationAddress, measurementDate }: RouteRequest = await req.json()

        // Calculate route using Google Maps API
        const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
        url.searchParams.append('origin', ORIGIN)
        url.searchParams.append('destination', destinationAddress)
        url.searchParams.append('mode', 'driving')
        url.searchParams.append('key', GOOGLE_MAPS_API_KEY)

        const response = await fetch(url.toString())
        const data = await response.json()

        if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
            throw new Error(`Google Maps API error: ${data.status}`)
        }

        const route = data.routes[0]
        const leg = route.legs[0]

        // Extract route data
        const distanceKm = leg.distance.value / 1000
        const durationMinutes = Math.round(leg.duration.value / 60)
        const polyline = route.overview_polyline.points
        const destinationLat = leg.end_location.lat
        const destinationLng = leg.end_location.lng

        // Get fuel price for measurement date
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: fuelPriceData } = await supabaseClient
            .from('fuel_prices')
            .select('price_per_liter')
            .lte('effective_date', measurementDate)
            .order('effective_date', { ascending: false })
            .limit(1)
            .single()

        const fuelPrice = fuelPriceData?.price_per_liter || 6.5

        // Save route to database
        const { data: routeData, error: routeError } = await supabaseClient
            .from('measurement_routes')
            .insert({
                measurement_id: measurementId,
                destination_address: destinationAddress,
                distance_km: distanceKm,
                duration_minutes: durationMinutes,
                route_polyline: polyline,
                fuel_price_per_liter: fuelPrice,
            })
            .select()
            .single()

        if (routeError) throw routeError

        // Update measurement with route_id and GPS coordinates
        await supabaseClient
            .from('measurements')
            .update({
                route_id: routeData.id,
                location_lat: destinationLat,
                location_lng: destinationLng,
            })
            .eq('id', measurementId)

        return new Response(
            JSON.stringify({
                success: true,
                route: routeData,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    } catch (error) {
        console.error('Error calculating route:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
})
