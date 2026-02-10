import { supabase } from '../lib/supabase';

export interface FuelPrice {
    id: string;
    price_per_liter: number;
    valid_from: string;
    valid_to: string | null;
    created_by: string | null;
    created_at: string;
}

export class FuelPriceService {
    /**
     * Get all fuel prices ordered by valid_from descending
     */
    static async getPrices(): Promise<FuelPrice[]> {
        const { data, error } = await supabase
            .from('fuel_prices')
            .select('*')
            .order('valid_from', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Add a new fuel price period
     */
    static async addPrice(price: {
        price_per_liter: number;
        valid_from: string;
        valid_to?: string | null;
    }): Promise<FuelPrice> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('fuel_prices')
            .insert({
                ...price,
                created_by: user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update an existing fuel price period
     */
    static async updatePrice(id: string, updates: {
        price_per_liter?: number;
        valid_from?: string;
        valid_to?: string | null;
    }): Promise<FuelPrice> {
        const { data, error } = await supabase
            .from('fuel_prices')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete a fuel price period
     */
    static async deletePrice(id: string): Promise<void> {
        const { error } = await supabase
            .from('fuel_prices')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Get current fuel price (for today)
     */
    static async getCurrentPrice(): Promise<number | null> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('fuel_prices')
            .select('price_per_liter')
            .lte('valid_from', today)
            .or(`valid_to.is.null,valid_to.gte.${today}`)
            .order('valid_from', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data?.price_per_liter || null;
    }

    /**
     * Get fuel price for a specific date
     */
    static async getPriceForDate(date: string): Promise<number | null> {
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
    }
}
