import { supabase } from '../lib/supabase';
import { RouteCalculationService } from './route-calculation.service';

/**
 * Script to recalculate routes for all measurements that don't have them
 */
async function recalculateAllRoutes() {

    try {
        // Get all measurements without routes
        const { data: measurements, error } = await supabase
            .from('measurements')
            .select('*')
            .is('route_id', null)
            .gte('scheduled_date', new Date().toISOString().split('T')[0]);

        if (error) throw error;


        if (!measurements || measurements.length === 0) {
            return;
        }

        let success = 0;
        let failed = 0;

        for (const measurement of measurements) {
            try {

                await RouteCalculationService.calculateAndSaveRoute(
                    measurement.id,
                    measurement.customer_address,
                    measurement.scheduled_date
                );

                success++;
            } catch (error) {
                failed++;
                console.error(`❌ Failed: ${measurement.customer_name}`, error);
            }

            // Wait a bit to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }


    } catch (error) {
        console.error('Error recalculating routes:', error);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    recalculateAllRoutes();
}

export { recalculateAllRoutes };
