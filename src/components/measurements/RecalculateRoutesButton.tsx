import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface RecalculateRoutesButtonProps {
    date: Date;
    onComplete?: () => void;
}

export const RecalculateRoutesButton: React.FC<RecalculateRoutesButtonProps> = ({ date, onComplete }) => {
    const [isRecalculating, setIsRecalculating] = useState(false);

    const recalculateRoutes = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRecalculating(true);

        try {
            const dateStr = date.toISOString().split('T')[0];

            // Get all measurements for this date (with or without route)
            const { data: measurements, error } = await supabase
                .from('measurements')
                .select('*')
                .gte('scheduled_date', `${dateStr}T00:00:00`)
                .lt('scheduled_date', `${dateStr}T23:59:59`)
                .order('scheduled_date', { ascending: true });

            if (error) throw error;

            if (!measurements || measurements.length === 0) {
                toast.success('Brak pomiarów do przeliczenia');
                setIsRecalculating(false);
                return;
            }

            // Delete existing routes for this day's measurements (full recalculation)
            const measurementIds = measurements.map(m => m.id);
            await supabase
                .from('measurement_routes')
                .delete()
                .in('measurement_id', measurementIds);

            // Reset route_id on measurements
            await supabase
                .from('measurements')
                .update({ route_id: null })
                .in('id', measurementIds);

            const toastId = toast.loading(`Przeliczanie tras: 0/${measurements.length}`);

            let success = 0;
            let failed = 0;

            for (let i = 0; i < measurements.length; i++) {
                const measurement = measurements[i];

                toast.loading(`Przeliczanie tras: ${i + 1}/${measurements.length}`, { id: toastId });

                try {
                    const { data, error } = await supabase.functions.invoke('calculate-route', {
                        body: {
                            measurementId: measurement.id,
                            destinationAddress: measurement.customer_address,
                            measurementDate: measurement.scheduled_date,
                        },
                    });

                    if (error) throw error;
                    if (!data.success) throw new Error(data.error);

                    success++;
                } catch (error) {
                    console.error(`Failed: ${measurement.customer_name}:`, error);
                    failed++;
                }

                await new Promise(resolve => setTimeout(resolve, 300));
            }

            toast.dismiss(toastId);

            if (failed === 0) {
                toast.success(`✅ Przeliczono ${success} tras!`);
            } else {
                toast.error(`⚠️ Sukces: ${success}, Błędy: ${failed}`);
            }

            if (onComplete) onComplete();

        } catch (error) {
            console.error('Error recalculating routes:', error);
            toast.error('Błąd podczas przeliczania tras');
        } finally {
            setIsRecalculating(false);
        }
    };

    return (
        <button
            onClick={recalculateRoutes}
            disabled={isRecalculating}
            className={`p-1 rounded transition-colors ${isRecalculating
                    ? 'text-blue-400 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
            title={isRecalculating ? 'Przeliczanie...' : 'Przelicz trasy'}
        >
            <RefreshCw size={16} className={isRecalculating ? 'animate-spin' : ''} />
        </button>
    );
};
