import { supabase } from '../../lib/supabase';
import type { Measurement, MeasurementReport } from '../../types';


// We don't import InstallationService avoiding circular deps if possible.
// Actually bulkCreateInstallations uses checkInstallationForContract.
// We should put Measurement logic here.

export const MeasurementService = {
    async getMeasurements(): Promise<Measurement[]> {
        const { data, error } = await supabase
            .from('measurements')
            .select(`
    *
    `)
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((m: any) => ({
            id: m.id,
            offerId: m.offer_id,
            scheduledDate: new Date(m.scheduled_date),
            salesRepId: m.sales_rep_id,
            salesRepName: '', // Can be populated if we join profiles
            customerName: m.customer_name,
            customerAddress: m.customer_address,
            customerPhone: m.customer_phone,
            status: m.status,
            notes: m.notes,
            createdAt: new Date(m.created_at),
            updatedAt: new Date(m.updated_at),
            estimatedDuration: m.estimated_duration,
            orderInRoute: m.order_in_route,
            locationLat: m.location_lat,
            locationLng: m.location_lng,
            distanceFromPrevious: m.distance_from_previous
        }));
    },

    async createMeasurementReport(report: Omit<MeasurementReport, 'id' | 'createdAt'>): Promise<MeasurementReport> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('measurement_reports')
            .insert({
                user_id: user.id,
                date: report.date,
                car_plate: report.carPlate,
                odometer_start: report.odometerStart,
                odometer_end: report.odometerEnd,
                total_km: report.totalKm,
                with_driver: report.withDriver,
                car_issues: report.carIssues,
                report_description: report.reportDescription,
                measurements_snapshot: report.visits // JSONB
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            date: data.date,
            salesRepId: data.user_id,
            carPlate: data.car_plate,
            odometerStart: data.odometer_start,
            odometerEnd: data.odometer_end,
            totalKm: data.total_km,
            withDriver: data.with_driver,
            carIssues: data.car_issues,
            reportDescription: data.report_description,
            visits: data.measurements_snapshot,
            signedContractsCount: 0,
            offerIds: [],
            createdAt: new Date(data.created_at)
        };
    },

    async getMeasurementReports(filters?: { userId?: string; dateFrom?: string; dateTo?: string }): Promise<MeasurementReport[]> {
        let query = supabase
            .from('measurement_reports')
            .select('*')
            .order('date', { ascending: false });

        if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters?.dateFrom) {
            query = query.gte('date', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('date', filters.dateTo);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(row => ({
            id: row.id,
            date: row.date,
            salesRepId: row.user_id,
            carPlate: row.car_plate,
            odometerStart: row.odometer_start,
            odometerEnd: row.odometer_end,
            totalKm: row.total_km,
            withDriver: row.with_driver,
            carIssues: row.car_issues,
            reportDescription: row.report_description,
            visits: row.measurements_snapshot || [],
            signedContractsCount: (row.measurements_snapshot || []).filter((v: any) => v.outcome === 'signed').length,
            offerIds: [],
            createdAt: new Date(row.created_at)
        }));
    },

    async getMeasurementsBySalesRep(userId: string): Promise<Measurement[]> {
        const { data, error } = await supabase
            .from('measurements')
            .select(`
    *,
    sales_rep: profiles!sales_rep_id(full_name)
        `)
            .eq('sales_rep_id', userId)
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((m: any) => ({
            id: m.id,
            offerId: m.offer_id,
            scheduledDate: new Date(m.scheduled_date),
            salesRepId: m.sales_rep_id,
            salesRepName: m.sales_rep?.full_name || '',
            customerName: m.customer_name,
            customerAddress: m.customer_address,
            customerPhone: m.customer_phone,
            status: m.status,
            notes: m.notes,
            createdAt: new Date(m.created_at),
            updatedAt: new Date(m.updated_at),
            estimatedDuration: m.estimated_duration,
            orderInRoute: m.order_in_route,
            locationLat: m.location_lat,
            locationLng: m.location_lng,
            distanceFromPrevious: m.distance_from_previous
        }));
    },

    async createMeasurement(measurement: {
        offerId?: string;
        scheduledDate: Date;
        salesRepId: string;
        customerName: string;
        customerAddress: string;
        customerPhone?: string;
        notes?: string;
        estimatedDuration?: number;
        locationLat?: number;
        locationLng?: number;
    }): Promise<Measurement> {
        const { data, error } = await supabase
            .from('measurements')
            .insert({
                offer_id: measurement.offerId,
                scheduled_date: measurement.scheduledDate.toISOString(),
                sales_rep_id: measurement.salesRepId,
                customer_name: measurement.customerName,
                customer_address: measurement.customerAddress,
                customer_phone: measurement.customerPhone,
                status: 'scheduled',
                notes: measurement.notes,
                estimated_duration: measurement.estimatedDuration,
                location_lat: measurement.locationLat,
                location_lng: measurement.locationLng
            })
            .select(`
        *,
        sales_rep: profiles!sales_rep_id(full_name)
            `)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            offerId: data.offer_id,
            scheduledDate: new Date(data.scheduled_date),
            salesRepId: data.sales_rep_id,
            salesRepName: data.sales_rep?.full_name || '',
            customerName: data.customer_name,
            customerAddress: data.customer_address,
            customerPhone: data.customer_phone,
            status: data.status,
            notes: data.notes,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    },

    async updateMeasurement(id: string, updates: {
        scheduledDate?: Date;
        customerName?: string;
        customerAddress?: string;
        customerPhone?: string;
        status?: 'scheduled' | 'completed' | 'cancelled';
        notes?: string;
        estimatedDuration?: number;
        orderInRoute?: number;
        locationLat?: number;
        locationLng?: number;
        distanceFromPrevious?: number;
    }): Promise<Measurement> {
        const updateData: any = {};
        if (updates.scheduledDate) updateData.scheduled_date = updates.scheduledDate.toISOString();
        if (updates.customerName) updateData.customer_name = updates.customerName;
        if (updates.customerAddress) updateData.customer_address = updates.customerAddress;
        if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone;
        if (updates.status) updateData.status = updates.status;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.estimatedDuration !== undefined) updateData.estimated_duration = updates.estimatedDuration;
        if (updates.orderInRoute !== undefined) updateData.order_in_route = updates.orderInRoute;
        if (updates.locationLat !== undefined) updateData.location_lat = updates.locationLat;
        if (updates.locationLng !== undefined) updateData.location_lng = updates.locationLng;
        if (updates.distanceFromPrevious !== undefined) updateData.distance_from_previous = updates.distanceFromPrevious;

        const { data, error } = await supabase
            .from('measurements')
            .update(updateData)
            .eq('id', id)
            .select(`
            *,
            sales_rep: profiles!sales_rep_id(full_name)
                `)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            offerId: data.offer_id,
            scheduledDate: new Date(data.scheduled_date),
            salesRepId: data.sales_rep_id,
            salesRepName: data.sales_rep?.full_name || '',
            customerName: data.customer_name,
            customerAddress: data.customer_address,
            customerPhone: data.customer_phone,
            status: data.status,
            notes: data.notes,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    },

    async deleteMeasurement(id: string): Promise<void> {
        const { error } = await supabase
            .from('measurements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Reports (Legacy/Other) ---
    async getReports(): Promise<MeasurementReport[]> {
        const { data, error } = await supabase
            .from('reports')
            .select('*');

        if (error) throw error;

        return data.map((row: any) => ({
            id: row.id,
            date: row.data.date,
            salesRepId: row.user_id,
            carPlate: row.data.carPlate,
            odometerStart: row.data.odometerStart,
            odometerEnd: row.data.odometerEnd,
            totalKm: row.data.totalKm,
            withDriver: row.data.withDriver,
            carIssues: row.data.carIssues,
            reportDescription: row.data.reportDescription,
            visits: row.data.visits || [],
            signedContractsCount: row.data.signedContractsCount,
            offerIds: row.data.offerIds || [],
            createdAt: new Date(row.created_at)
        }));
    },

    async createReport(report: Omit<MeasurementReport, 'createdAt'>): Promise<MeasurementReport> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const reportData = {
            date: report.date,
            carPlate: report.carPlate,
            odometerStart: report.odometerStart,
            odometerEnd: report.odometerEnd,
            totalKm: report.totalKm,
            withDriver: report.withDriver,
            carIssues: report.carIssues,
            reportDescription: report.reportDescription,
            visits: report.visits,
            signedContractsCount: report.signedContractsCount,
            offerIds: report.offerIds
        };

        const { data, error } = await supabase
            .from('reports')
            .insert({
                user_id: user.id,
                data: reportData
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            date: data.data.date,
            salesRepId: data.user_id,
            carPlate: data.data.carPlate,
            odometerStart: data.data.odometerStart,
            odometerEnd: data.data.odometerEnd,
            totalKm: data.data.totalKm,
            withDriver: data.data.withDriver,
            carIssues: data.data.carIssues,
            reportDescription: data.data.reportDescription,
            visits: data.data.visits || [],
            signedContractsCount: data.data.signedContractsCount,
            offerIds: data.data.offerIds || [],
            createdAt: new Date(data.created_at)
        };
    },

    async deleteReport(id: string): Promise<void> {
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
