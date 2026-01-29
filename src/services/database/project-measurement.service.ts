import { supabase } from '../../lib/supabase';
import type { ProjectMeasurement } from '../../types';

export const ProjectMeasurementService = {
    async getMeasurements(customerId?: string, contractId?: string): Promise<ProjectMeasurement[]> {
        let query = supabase
            .from('project_measurements')
            .select(`
                *,
                creator:created_by (
                    first_name,
                    last_name
                )
            `)
            .order('created_at', { ascending: false });

        if (customerId) {
            query = query.eq('customer_id', customerId);
        }
        if (contractId) {
            query = query.eq('contract_id', contractId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(mapMeasurement);
    },

    async getMeasurement(id: string): Promise<ProjectMeasurement | null> {
        const { data, error } = await supabase
            .from('project_measurements')
            .select(`
                *,
                creator:created_by (
                    first_name,
                    last_name
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return mapMeasurement(data);
    },

    async createMeasurement(measurement: Partial<ProjectMeasurement>): Promise<ProjectMeasurement> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('project_measurements')
            .insert({
                name: measurement.name,
                customer_id: measurement.customerId,
                contract_id: measurement.contractId,
                status: measurement.status || 'draft',
                model_id: measurement.modelId,
                inputs: measurement.inputs,
                results: measurement.results,
                dimension_options: measurement.dimensionOptions,
                images: measurement.images || [],
                notes: measurement.notes,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return mapMeasurement(data);
    },

    async updateMeasurement(id: string, updates: Partial<ProjectMeasurement>): Promise<ProjectMeasurement> {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.modelId) dbUpdates.model_id = updates.modelId;
        if (updates.inputs) dbUpdates.inputs = updates.inputs;
        if (updates.results) dbUpdates.results = updates.results;
        if (updates.dimensionOptions) dbUpdates.dimension_options = updates.dimensionOptions;
        if (updates.images) dbUpdates.images = updates.images;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('project_measurements')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapMeasurement(data);
    },

    async deleteMeasurement(id: string): Promise<void> {
        const { error } = await supabase
            .from('project_measurements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

function mapMeasurement(row: any): ProjectMeasurement {
    return {
        id: row.id,
        name: row.name,
        customerId: row.customer_id,
        contractId: row.contract_id,
        status: row.status,
        modelId: row.model_id,
        inputs: row.inputs,
        results: row.results,
        dimensionOptions: row.dimension_options,
        images: row.images || [],
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        creator: row.creator ? {
            firstName: row.creator.first_name,
            lastName: row.creator.last_name
        } : undefined
    };
}
