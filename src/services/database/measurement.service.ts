import { supabase } from '../../lib/supabase';
import type { Measurement, MeasurementReport } from '../../types';
import { GeocodingService } from '../GeocodingService';


// We don't import InstallationService avoiding circular deps if possible.
// Actually bulkCreateInstallations uses checkInstallationForContract.
// We should put Measurement logic here.

export const MeasurementService = {
    async getMeasurements(): Promise<Measurement[]> {
        const { data, error } = await supabase
            .from('measurements')
            .select(`
    *,
    sales_rep: profiles!sales_rep_id(full_name)
    `)
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((m) => ({
            id: m.id,
            offerId: m.offer_id,
            leadId: m.lead_id,
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
                trip_cost: report.tripCost || null,
                cost_per_km: report.costPerKm || null,
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
            is_active: true,
            currency: 'PLN',
            createdAt: new Date(data.created_at)
        };
    },

    async updateMeasurementReport(id: string, updates: Partial<MeasurementReport>): Promise<void> {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.carPlate) dbUpdates.car_plate = updates.carPlate;
        if (updates.odometerStart !== undefined) dbUpdates.odometer_start = updates.odometerStart;
        if (updates.odometerEnd !== undefined) dbUpdates.odometer_end = updates.odometerEnd;
        if (updates.totalKm !== undefined) dbUpdates.total_km = updates.totalKm;
        if (updates.withDriver !== undefined) dbUpdates.with_driver = updates.withDriver;
        if (updates.carIssues !== undefined) dbUpdates.car_issues = updates.carIssues;
        if (updates.reportDescription !== undefined) dbUpdates.report_description = updates.reportDescription;
        if (updates.visits) dbUpdates.measurements_snapshot = updates.visits;
        if (updates.tripCost !== undefined) dbUpdates.trip_cost = updates.tripCost;
        if (updates.costPerKm !== undefined) dbUpdates.cost_per_km = updates.costPerKm;

        const { error } = await supabase
            .from('measurement_reports')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async updateReportTripCost(id: string, tripCost: number, costPerKm?: number): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('measurement_reports')
            .update({
                trip_cost: tripCost,
                cost_per_km: costPerKm || null,
                trip_cost_updated_by: user.id,
                trip_cost_updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
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

        // Fetch sales rep names separately
        const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
        const userNameMap = new Map<string, string>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            if (profiles) {
                profiles.forEach(p => userNameMap.set(p.id, p.full_name || ''));
            }
        }

        return (data || []).map(row => ({
            id: row.id,
            date: row.date,
            salesRepId: row.user_id,
            salesRepName: userNameMap.get(row.user_id) || '',
            carPlate: row.car_plate,
            odometerStart: row.odometer_start,
            odometerEnd: row.odometer_end,
            totalKm: row.total_km,
            withDriver: row.with_driver,
            carIssues: row.car_issues,
            reportDescription: row.report_description,
            visits: row.measurements_snapshot || [],
            signedContractsCount: (row.measurements_snapshot || []).filter((v: { outcome: string }) => v.outcome === 'signed').length,
            offerIds: [],
            is_active: true,
            currency: 'EUR',
            createdAt: new Date(row.created_at),
            tripCost: row.trip_cost ? parseFloat(row.trip_cost) : undefined,
            costPerKm: row.cost_per_km ? parseFloat(row.cost_per_km) : undefined,
            tripCostUpdatedBy: row.trip_cost_updated_by,
            tripCostUpdatedAt: row.trip_cost_updated_at ? new Date(row.trip_cost_updated_at) : undefined
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

        return (data || []).map((m) => ({
            id: m.id,
            offerId: m.offer_id,
            leadId: m.lead_id,
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
        leadId?: string;
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

        // Auto-Geocode if missing location data
        if (!measurement.locationLat || !measurement.locationLng) {
            if (measurement.customerAddress) {
                const coords = await GeocodingService.search(measurement.customerAddress);
                if (coords) {
                    measurement.locationLat = coords.lat;
                    measurement.locationLng = coords.lng;
                }
            }
        }

        const { data, error } = await supabase
            .from('measurements')
            .insert({
                offer_id: measurement.offerId || null,
                lead_id: measurement.leadId || null,
                scheduled_date: measurement.scheduledDate.toISOString(),
                sales_rep_id: measurement.salesRepId,
                customer_name: measurement.customerName,
                customer_address: measurement.customerAddress,
                customer_phone: measurement.customerPhone || null,
                status: 'scheduled',
                notes: measurement.notes || null,
                location_lat: measurement.locationLat || null,
                location_lng: measurement.locationLng || null
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
            leadId: data.lead_id,
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
        const updateData: Record<string, unknown> = {};
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
            leadId: data.lead_id,
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

        return data.map((row) => ({
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
            is_active: true,
            currency: 'PLN',
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
            is_active: true,
            currency: 'PLN',
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
