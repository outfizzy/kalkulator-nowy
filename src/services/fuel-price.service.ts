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
     * Get all fuel prices ordered by valid_from ascending (for batch lookups)
     */
    static async getAllPricesSorted(): Promise<FuelPrice[]> {
        const { data, error } = await supabase
            .from('fuel_prices')
            .select('*')
            .order('valid_from', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Add a new fuel price period.
     * Automatically closes the previous open-ended price entry
     * by setting its valid_to to the day before this new price starts.
     */
    static async addPrice(price: {
        price_per_liter: number;
        valid_from: string;
        valid_to?: string | null;
    }): Promise<FuelPrice> {
        const { data: { user } } = await supabase.auth.getUser();

        // Auto-close previous open-ended price entries
        // Find any price with valid_to = null that starts before this new price
        const { data: openPrices } = await supabase
            .from('fuel_prices')
            .select('id, valid_from')
            .is('valid_to', null)
            .lt('valid_from', price.valid_from)
            .order('valid_from', { ascending: false });

        if (openPrices && openPrices.length > 0) {
            // Set valid_to to the day before the new price starts
            const dayBefore = new Date(price.valid_from);
            dayBefore.setDate(dayBefore.getDate() - 1);
            const validToDate = dayBefore.toISOString().split('T')[0];

            for (const op of openPrices) {
                await supabase
                    .from('fuel_prices')
                    .update({ valid_to: validToDate })
                    .eq('id', op.id);
            }
        }

        const { data, error } = await supabase
            .from('fuel_prices')
            .insert({
                ...price,
                valid_to: price.valid_to || null,
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

    /**
     * Pure function: find price for a given date from a pre-fetched sorted list
     * Prices must be sorted ascending by valid_from.
     * Returns the last price whose valid_from <= date and (valid_to is null or valid_to >= date).
     */
    static getPriceForDateFromList(date: string, prices: FuelPrice[]): number | null {
        let result: number | null = null;
        for (const p of prices) {
            if (p.valid_from <= date && (!p.valid_to || p.valid_to >= date)) {
                result = Number(p.price_per_liter);
            }
        }
        return result;
    }
}

