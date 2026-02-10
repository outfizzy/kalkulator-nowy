import { supabase } from '../lib/supabase';
import { RouteCalculationService } from './route-calculation.service';

/**
 * Script to recalculate routes for all measurements that don't have them
 */
async function recalculateAllRoutes() {
    console.log('🔄 Starting route recalculation...');

    try {
        // Get all measurements without routes
        const { data: measurements, error } = await supabase
            .from('measurements')
            .select('*')
            .is('route_id', null)
            .gte('scheduled_date', new Date().toISOString().split('T')[0]);

        if (error) throw error;

        console.log(`Found ${measurements?.length || 0} measurements without routes`);

        if (!measurements || measurements.length === 0) {
            console.log('✅ All measurements have routes!');
            return;
        }

        let success = 0;
        let failed = 0;

        for (const measurement of measurements) {
            try {
                console.log(`Calculating route for: ${measurement.customer_name}`);

                await RouteCalculationService.calculateAndSaveRoute(
                    measurement.id,
                    measurement.customer_address,
                    measurement.scheduled_date
                );

                success++;
                console.log(`✅ Success: ${measurement.customer_name}`);
            } catch (error) {
                failed++;
                console.error(`❌ Failed: ${measurement.customer_name}`, error);
            }

            // Wait a bit to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`\n📊 Results:`);
        console.log(`✅ Success: ${success}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📍 Total: ${measurements.length}`);

    } catch (error) {
        console.error('Error recalculating routes:', error);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    recalculateAllRoutes();
}

export { recalculateAllRoutes };
