import React, { useState } from 'react';
import { RouteCalculationService } from '../../services/route-calculation.service';
import { supabase } from '../../lib/supabase';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const RecalculateRoutesButton: React.FC = () => {
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const recalculateRoutes = async () => {
        setIsRecalculating(true);

        try {
            // Get all measurements without routes from today onwards
            const { data: measurements, error } = await supabase
                .from('measurements')
                .select('*')
                .is('route_id', null)
                .gte('scheduled_date', new Date().toISOString().split('T')[0])
                .order('scheduled_date', { ascending: true });

            if (error) throw error;

            if (!measurements || measurements.length === 0) {
                toast.success('Wszystkie pomiary mają już obliczone trasy!');
                setIsRecalculating(false);
                return;
            }

            setProgress({ current: 0, total: measurements.length });
            toast.success(`Znaleziono ${measurements.length} pomiarów do przeliczenia`);

            let success = 0;
            let failed = 0;

            for (let i = 0; i < measurements.length; i++) {
                const measurement = measurements[i];
                setProgress({ current: i + 1, total: measurements.length });

                try {
                    await RouteCalculationService.calculateAndSaveRoute(
                        measurement.id,
                        measurement.customer_address,
                        measurement.scheduled_date
                    );
                    success++;
                } catch (error) {
                    console.error(`Failed to calculate route for ${measurement.customer_name}:`, error);
                    failed++;
                }

                // Wait to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (failed === 0) {
                toast.success(`✅ Przeliczono ${success} tras!`);
            } else {
                toast.error(`⚠️ Sukces: ${success}, Błędy: ${failed}`);
            }

        } catch (error) {
            console.error('Error recalculating routes:', error);
            toast.error('Błąd podczas przeliczania tras');
        } finally {
            setIsRecalculating(false);
            setProgress({ current: 0, total: 0 });
        }
    };

    return (
        <button
            onClick={recalculateRoutes}
            disabled={isRecalculating}
            className={`
                px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                ${isRecalculating
                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                }
            `}
        >
            <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating
                ? `Przeliczanie... ${progress.current}/${progress.total}`
                : 'Przelicz Trasy'
            }
        </button>
    );
};
